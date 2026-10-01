import { CmsConfigurationError } from '../config/validate-environment';
import {
  createPublishOutboxWorker,
  createStrapiPublishOutboxRepository,
  publicationDedupeKey,
  publicationEvents,
} from './publishing/publish-outbox';
import type { Core } from '@strapi/strapi';

let workerTimer: NodeJS.Timeout | undefined;
let outboxListeners: Array<() => void> = [];

export type PublishOutboxErrorCode = 'CONFIG_INVALID' | 'INTERNAL_ERROR';

export function classifyPublishOutboxError(
  error: unknown,
): PublishOutboxErrorCode {
  return error instanceof CmsConfigurationError
    ? 'CONFIG_INVALID'
    : 'INTERNAL_ERROR';
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const repository = createStrapiPublishOutboxRepository(strapi);
    await repository.initialize();

    outboxListeners = publicationEvents.map((event) =>
      strapi.eventHub.on(event, async (info: unknown) => {
        if (!info || typeof info !== 'object') return;
        const payload = info as {
          entry?: Record<string, unknown>;
          model?: unknown;
          uid?: unknown;
        };
        const model =
          typeof payload.uid === 'string'
            ? payload.uid
            : typeof payload.model === 'string'
              ? payload.model
              : '';
        const entry = payload.entry ?? {};
        const occurredAt = Date.now();
        const dedupeKey = publicationDedupeKey(event, model, entry, occurredAt);
        if (!dedupeKey) {
          strapi.log.warn('Ignoring publish event without stable identity', {
            event,
            operation: 'publish.outbox.enqueue',
            service: 'cms',
          });
          return;
        }
        await repository.enqueue(event, model, dedupeKey, occurredAt);
      }),
    );

    const endpoint = process.env.LANDING_PUBLISH_WEBHOOK_URL;
    const signingSecret = process.env.STRAPI_WEBHOOK_SIGNING_SECRET;
    if (Boolean(endpoint) !== Boolean(signingSecret)) {
      throw new CmsConfigurationError(
        'LANDING_PUBLISH_WEBHOOK_URL and STRAPI_WEBHOOK_SIGNING_SECRET must be configured together.',
      );
    }
    if (!endpoint || !signingSecret) return;

    const worker = createPublishOutboxWorker({
      endpoint,
      repository,
      signingSecret,
    });
    let processing = false;
    workerTimer = setInterval(() => {
      if (processing) return;
      processing = true;
      void worker
        .deliverReadyBatch()
        .then((result) => {
          if (result === 'retry') {
            strapi.log.warn('Landing publish delivery scheduled for retry', {
              operation: 'publish.outbox.deliver',
              service: 'cms',
            });
          }
        })
        .catch((error: unknown) => {
          strapi.log.error('Landing publish outbox processing failed', {
            errorCode: classifyPublishOutboxError(error),
            operation: 'publish.outbox.deliver',
            service: 'cms',
          });
        })
        .finally(() => {
          processing = false;
        });
    }, 1_000);
    workerTimer.unref();
  },

  async destroy() {
    if (workerTimer) clearInterval(workerTimer);
    workerTimer = undefined;
    for (const unsubscribe of outboxListeners) unsubscribe();
    outboxListeners = [];
  },
};
