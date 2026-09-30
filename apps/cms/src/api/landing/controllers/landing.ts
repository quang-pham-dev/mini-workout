import {
  type SnapshotStatus,
  createLandingSnapshot,
} from '../services/snapshot';
import { SnapshotMappingError } from '../services/snapshot-mapper';
import type { Core } from '@strapi/strapi';
import { randomUUID } from 'node:crypto';

interface HttpContext {
  body: unknown;
  status: number;
  set(name: string, value: string): void;
  get(name: string): string;
}

function requestId(context: HttpContext): string {
  const candidate = context.get('x-request-id');
  return candidate.length > 0 && candidate.length <= 128
    ? candidate
    : randomUUID();
}

async function respond(
  strapi: Core.Strapi,
  context: HttpContext,
  status: SnapshotStatus,
): Promise<void> {
  const id = requestId(context);
  context.set('x-request-id', id);
  context.set('cache-control', 'private, no-store');

  try {
    context.body = await createLandingSnapshot(strapi, status);
  } catch (error) {
    const code =
      error instanceof SnapshotMappingError ? error.code : 'INTERNAL_ERROR';
    strapi.log.error('Landing snapshot generation failed', {
      errorCode: code,
      operation: `landing.snapshot.${status}`,
      requestId: id,
      service: 'cms',
    });
    context.status = error instanceof SnapshotMappingError ? 503 : 500;
    context.body = {
      error: {
        code:
          error instanceof SnapshotMappingError
            ? 'DEPENDENCY_UNAVAILABLE'
            : code,
        message: 'Landing content is temporarily unavailable.',
        requestId: id,
      },
    };
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async publishedSnapshot(context: HttpContext) {
    await respond(strapi, context, 'published');
  },

  async draftSnapshot(context: HttpContext) {
    await respond(strapi, context, 'draft');
  },
});
