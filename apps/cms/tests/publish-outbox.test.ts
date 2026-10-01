import {
  createPublishOutboxWorker,
  createStrapiPublishOutboxRepository,
  publicationDedupeKey,
} from '../src/publishing/publish-outbox.js';
import { Database } from '@strapi/database';
import type { Core } from '@strapi/strapi';
import { createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const secret = 'publish-signing-secret-with-at-least-32-characters';
const endpoint = 'https://preview.example.com/api/webhooks/strapi/publish';
const now = Date.parse('2026-09-30T08:00:00.000Z');

function setup(
  fetch: typeof globalThis.fetch = vi.fn(
    async () => new Response(null, { status: 202 }),
  ),
) {
  const repository = {
    claimReadyBatch: vi.fn(async () => [
      { id: 'event-2', event: 'entry.publish', model: 'api::article.article' },
      { id: 'event-3', event: 'entry.publish', model: 'api::article.article' },
      {
        id: 'event-1',
        event: 'entry.unpublish',
        model: 'api::campaign.campaign',
      },
    ]),
    markDelivered: vi.fn(async () => undefined),
    scheduleRetry: vi.fn(async () => undefined),
  };
  return {
    fetch,
    repository,
    worker: createPublishOutboxWorker({
      endpoint,
      fetch,
      now: () => now,
      repository,
      signingSecret: secret,
    }),
  };
}

describe('Strapi publish outbox worker', () => {
  it('coalesces ready events into one signed request and marks them delivered', async () => {
    const { fetch, repository, worker } = setup();

    await expect(worker.deliverReadyBatch()).resolves.toBe('delivered');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe(endpoint);
    const rawBody = String(init?.body);
    const timestamp = new Date(now).toISOString();
    const deliveryId = String(
      new Headers(init?.headers).get('x-strapi-delivery-id'),
    );
    expect(init?.headers).toMatchObject({
      'content-type': 'application/json',
      'x-strapi-delivery-id': expect.any(String),
      'x-strapi-signature': `sha256=${createHmac('sha256', secret)
        .update(`${timestamp}.${deliveryId}.${rawBody}`)
        .digest('hex')}`,
      'x-strapi-timestamp': timestamp,
    });
    expect(JSON.parse(rawBody)).toEqual({
      createdAt: new Date(now).toISOString(),
      events: [
        { event: 'entry.publish', model: 'api::article.article' },
        { event: 'entry.unpublish', model: 'api::campaign.campaign' },
      ],
    });
    expect(repository.markDelivered).toHaveBeenCalledWith(
      ['event-1', 'event-2', 'event-3'],
      now,
    );
    expect(repository.scheduleRetry).not.toHaveBeenCalled();
  });

  it('retains the batch and schedules retry when the receiver fails', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(null, { status: 503 }));
    const { repository, worker } = setup(fetch);

    await expect(worker.deliverReadyBatch()).resolves.toBe('retry');

    expect(repository.markDelivered).not.toHaveBeenCalled();
    expect(repository.scheduleRetry).toHaveBeenCalledWith(
      ['event-1', 'event-2', 'event-3'],
      now,
    );
  });

  it('does not send a request when no batch is ready', async () => {
    const { fetch, repository, worker } = setup();
    repository.claimReadyBatch.mockResolvedValueOnce([]);

    await expect(worker.deliverReadyBatch()).resolves.toBe('empty');

    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects weak secrets and non-HTTPS remote webhook destinations', () => {
    expect(() =>
      createPublishOutboxWorker({
        endpoint: 'https://preview.example.com/api/webhooks/strapi/publish',
        repository: setup().repository,
        signingSecret: 'weak',
      }),
    ).toThrow('Publish delivery configuration is invalid.');
    expect(() =>
      createPublishOutboxWorker({
        endpoint: 'http://attacker.example/api/webhooks/strapi/publish',
        repository: setup().repository,
        signingSecret: secret,
      }),
    ).toThrow('Publish delivery configuration is invalid.');
  });
});

describe('Strapi publish outbox persistence', () => {
  it('deduplicates only identical event revisions and requires stable identity', () => {
    const first = publicationDedupeKey(
      'entry.publish',
      'api::article.article',
      { documentId: 'doc-1', updatedAt: '2026-09-30T08:00:00.000Z' },
      now,
    );
    expect(
      publicationDedupeKey(
        'entry.publish',
        'api::article.article',
        { documentId: 'doc-1', updatedAt: '2026-09-30T08:00:00.000Z' },
        now + 1_000,
      ),
    ).toBe(first);
    expect(
      publicationDedupeKey(
        'entry.publish',
        'api::article.article',
        { documentId: 'doc-1', updatedAt: '2026-09-30T08:01:00.000Z' },
        now,
      ),
    ).not.toBe(first);
    expect(
      publicationDedupeKey('media.update', 'plugin::upload.file', {}, now),
    ).toBeUndefined();
  });

  it('persists, coalesces, reclaims leases, retries, and completes SQLite rows', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cms-publish-outbox-'));
    const database = new Database({
      connection: {
        client: 'sqlite',
        connection: { filename: join(directory, 'outbox.db') },
        useNullAsDefault: true,
      },
      settings: { migrations: { dir: '.tmp' } },
    });
    await database.init({ models: [] });
    const repository = createStrapiPublishOutboxRepository({
      db: database,
    } as unknown as Core.Strapi);

    try {
      await repository.initialize();
      await repository.enqueue(
        'entry.publish',
        'api::article.article',
        'stable-event-key',
        now,
      );
      await repository.enqueue(
        'entry.publish',
        'api::article.article',
        'stable-event-key',
        now + 1,
      );
      await repository.enqueue(
        'entry.unpublish',
        'api::article.article',
        'second-stable-event-key',
        now + 4_000,
      );
      expect(await repository.claimReadyBatch(now + 5_000)).toEqual([]);
      expect(await repository.claimReadyBatch(now + 8_999)).toEqual([]);
      const claimed = await repository.claimReadyBatch(now + 9_000);
      expect(claimed).toHaveLength(2);
      expect(claimed[0]).toMatchObject({
        attempts: 0,
        event: 'entry.publish',
        model: 'api::article.article',
      });

      const reclaimed = await repository.claimReadyBatch(now + 69_000);
      expect(reclaimed.map(({ id }) => id)).toEqual(
        claimed.map(({ id }) => id),
      );
      await repository.scheduleRetry(
        reclaimed.map(({ id }) => id),
        now + 69_000,
      );
      expect(await repository.claimReadyBatch(now + 69_999)).toEqual([]);
      const retried = await repository.claimReadyBatch(now + 70_000);
      expect(retried).toHaveLength(2);
      expect(retried.every(({ attempts }) => attempts === 1)).toBe(true);
      await repository.markDelivered(
        retried.map(({ id }) => id),
        now + 70_000,
      );
      expect(await repository.claimReadyBatch(now + 75_000)).toEqual([]);
    } finally {
      await database.destroy();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
