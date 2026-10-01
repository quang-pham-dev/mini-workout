import { CmsConfigurationError } from '../../config/validate-environment';
import type { Core } from '@strapi/strapi';
import { createHash, createHmac } from 'node:crypto';

const tableName = 'cms_publish_outbox';
const coalescingWindowMs = 5_000;
const leaseMs = 60_000;
const batchLimit = 5_000;
const maximumRetryDelayMs = 5 * 60_000;

export const publicationEvents = [
  'entry.publish',
  'entry.unpublish',
  'entry.delete',
  'media.update',
  'media.delete',
] as const;

const allowedModels = new Set([
  'api::article.article',
  'api::author.author',
  'api::campaign.campaign',
  'api::category.category',
  'api::marketing-page.marketing-page',
  'api::pricing-page.pricing-page',
  'api::primary-navigation.primary-navigation',
  'api::site-setting.site-setting',
  'plugin::upload.file',
]);

export interface PublishOutboxItem {
  id: string;
  event: (typeof publicationEvents)[number];
  model: string;
  attempts: number;
}

export interface PublishOutboxRepository {
  claimReadyBatch(now: number): Promise<PublishOutboxItem[]>;
  markDelivered(ids: string[], now: number): Promise<void>;
  scheduleRetry(ids: string[], now: number): Promise<void>;
}

interface PublishOutboxWorkerOptions {
  endpoint: string;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
  repository: PublishOutboxRepository;
  signingSecret: string;
}

function buildPayload(items: PublishOutboxItem[], now: number): string {
  const events = new Map<string, { event: string; model: string }>();
  for (const { event, model } of items) {
    events.set(`${event}:${model}`, { event, model });
  }
  return JSON.stringify({
    createdAt: new Date(now).toISOString(),
    events: [...events.values()].sort((left, right) =>
      `${left.event}:${left.model}`.localeCompare(
        `${right.event}:${right.model}`,
      ),
    ),
  });
}

function validateWorkerConfiguration(endpoint: string, secret: string): void {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new CmsConfigurationError(
      'Publish delivery endpoint configuration is invalid.',
    );
  }
  const localHost = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (
    secret.length < 32 ||
    url.pathname !== '/api/webhooks/strapi/publish' ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== '' ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && localHost.has(url.hostname)))
  ) {
    throw new CmsConfigurationError(
      'Publish delivery configuration is invalid.',
    );
  }
}

export function createPublishOutboxWorker(options: PublishOutboxWorkerOptions) {
  validateWorkerConfiguration(options.endpoint, options.signingSecret);
  const fetchDependency = options.fetch ?? fetch;
  const now = options.now ?? Date.now;

  return {
    async deliverReadyBatch(): Promise<'delivered' | 'retry' | 'empty'> {
      const startedAt = now();
      const items = await options.repository.claimReadyBatch(startedAt);
      if (items.length === 0) return 'empty';

      const ids = items.map(({ id }) => id).sort();
      const deliveryId = createHash('sha256')
        .update(ids.join('\n'))
        .digest('hex');
      const timestamp = new Date(startedAt).toISOString();
      const body = buildPayload(items, startedAt);
      const signature = createHmac('sha256', options.signingSecret)
        .update(`${timestamp}.${deliveryId}.${body}`)
        .digest('hex');

      try {
        const response = await fetchDependency(options.endpoint, {
          method: 'POST',
          body,
          redirect: 'error',
          signal: AbortSignal.timeout(8_000),
          headers: {
            'content-type': 'application/json',
            'x-strapi-delivery-id': deliveryId,
            'x-strapi-signature': `sha256=${signature}`,
            'x-strapi-timestamp': timestamp,
          },
        });
        if (!response.ok)
          throw new Error('Publish receiver rejected delivery.');
        await options.repository.markDelivered(ids, now());
        return 'delivered';
      } catch {
        await options.repository.scheduleRetry(ids, now());
        return 'retry';
      }
    },
  };
}

type OutboxRow = {
  id: string;
  event: string;
  model: string;
  attempts: number;
};

export function createStrapiPublishOutboxRepository(strapi: Core.Strapi) {
  const connection = strapi.db.connection;

  return {
    async initialize(): Promise<void> {
      const hasTable = await connection.schema.hasTable(tableName);
      if (hasTable) return;
      await connection.schema.createTable(tableName, (table) => {
        table.string('id', 64).primary();
        table.string('dedupe_key', 64).notNullable().unique();
        table.string('event', 32).notNullable();
        table.string('model', 128).notNullable();
        table.integer('attempts').notNullable().defaultTo(0);
        table.bigInteger('created_at').notNullable();
        table.bigInteger('available_at').notNullable();
        table.bigInteger('locked_at').nullable();
        table.bigInteger('delivered_at').nullable();
        table.index(
          ['delivered_at', 'available_at', 'locked_at'],
          'cms_publish_outbox_delivery_idx',
        );
        table.index(
          ['delivered_at', 'created_at'],
          'cms_publish_outbox_pending_idx',
        );
      });
    },

    async enqueue(event: string, model: string, dedupeKey: string, at: number) {
      if (
        !publicationEvents.includes(
          event as (typeof publicationEvents)[number],
        ) ||
        !allowedModels.has(model)
      ) {
        return;
      }
      await connection(tableName)
        .insert({
          id: createHash('sha256').update(`${dedupeKey}:${at}`).digest('hex'),
          dedupe_key: dedupeKey,
          event,
          model,
          attempts: 0,
          created_at: at,
          available_at: at + coalescingWindowMs,
          locked_at: null,
          delivered_at: null,
        })
        .onConflict('dedupe_key')
        .ignore();
    },

    async claimReadyBatch(now: number): Promise<PublishOutboxItem[]> {
      return connection.transaction(async (transaction) => {
        const cutoff = now;
        const expiredLease = now - leaseMs;
        const newestPending = (await transaction(tableName)
          .max('created_at as newest_created_at')
          .whereNull('delivered_at')
          .first()) as { newest_created_at: number | string | null };
        if (
          newestPending.newest_created_at !== null &&
          now - Number(newestPending.newest_created_at) < coalescingWindowMs
        ) {
          return [];
        }
        const query = transaction(tableName)
          .whereNull('delivered_at')
          .where('available_at', '<=', cutoff)
          .where((builder) =>
            builder
              .whereNull('locked_at')
              .orWhere('locked_at', '<=', expiredLease),
          )
          .orderBy('created_at', 'asc')
          .limit(batchLimit);

        if (connection.client.config.client === 'pg')
          query.forUpdate().skipLocked();
        const rows = (await query) as OutboxRow[];
        if (rows.length === 0) return [];

        const ids = rows.map(({ id }) => id);
        await transaction(tableName)
          .whereIn('id', ids)
          .update({ locked_at: cutoff });
        return rows.map((row) => ({
          attempts: row.attempts,
          event: row.event as PublishOutboxItem['event'],
          id: row.id,
          model: row.model,
        }));
      });
    },

    async markDelivered(ids: string[], now: number): Promise<void> {
      if (ids.length === 0) return;
      await connection(tableName).whereIn('id', ids).update({
        delivered_at: now,
        locked_at: null,
      });
    },

    async scheduleRetry(ids: string[], now: number): Promise<void> {
      if (ids.length === 0) return;
      const rows = (await connection(tableName)
        .select('id', 'attempts')
        .whereIn('id', ids)) as Array<{ id: string; attempts: number }>;
      await Promise.all(
        rows.map((row) => {
          const attempts = row.attempts + 1;
          const delay = Math.min(
            1_000 * 2 ** Math.min(attempts - 1, 8),
            maximumRetryDelayMs,
          );
          return connection(tableName)
            .where('id', row.id)
            .update({
              attempts,
              available_at: now + delay,
              locked_at: null,
            });
        }),
      );
    },
  };
}

export function publicationDedupeKey(
  event: string,
  model: string,
  entry: Record<string, unknown>,
  occurredAt = Date.now(),
): string | undefined {
  const identity = entry.documentId ?? entry.id ?? entry.hash;
  if (identity === undefined || identity === null || identity === '') {
    return undefined;
  }
  const revision = entry.updatedAt ?? entry.publishedAt ?? occurredAt;
  return createHash('sha256')
    .update(JSON.stringify([event, model, identity, revision]))
    .digest('hex');
}
