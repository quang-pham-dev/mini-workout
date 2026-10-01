import type { LandingServiceOutcome } from '../operations/service-level-policy.js';
import {
  type LandingServiceObservationRecorder,
  recordLandingServiceObservation,
} from '../operations/service-observation-recorder.js';
import {
  AppError,
  type ErrorReporter,
  classifyError,
  createRequestContext,
  toPublicError,
} from '@mini-workout/observability';
import { createHmac, timingSafeEqual } from 'node:crypto';

const maximumBodyBytes = 64 * 1024;
const eventToleranceMs = 5 * 60 * 1000;
const deliveryTtlMs = 10 * 60 * 1000;

const allowedEvents = new Set([
  'entry.publish',
  'entry.unpublish',
  'entry.delete',
  'media.update',
  'media.delete',
]);

const allowedModels = new Set([
  'article',
  'api::article.article',
  'author',
  'api::author.author',
  'campaign',
  'api::campaign.campaign',
  'category',
  'api::category.category',
  'marketing-page',
  'api::marketing-page.marketing-page',
  'pricing-page',
  'api::pricing-page.pricing-page',
  'primary-navigation',
  'api::primary-navigation.primary-navigation',
  'site-setting',
  'api::site-setting.site-setting',
  'site-settings',
  'api::site-settings.site-settings',
  'file',
  'plugin::upload.file',
]);

export interface StrapiDeliveryStore {
  claim(key: string, now: number, ttlMs: number): boolean;
  release(key: string): void;
}

interface StrapiPublishWebhookOptions {
  signingSecret?: string;
  deployHookUrl?: string;
  deliveryStore?: StrapiDeliveryStore;
  fetch?: typeof fetch;
  now?: () => number;
  recorder?: LandingServiceObservationRecorder;
  reporter: ErrorReporter;
}

interface StrapiWebhookEvent {
  event: string;
  model: string;
}

interface StrapiWebhookPayload {
  createdAt: string;
  events: StrapiWebhookEvent[];
}

export function createMemoryStrapiDeliveryStore(): StrapiDeliveryStore {
  const deliveries = new Map<string, number>();
  return {
    claim(key, now, ttlMs) {
      for (const [storedKey, expiresAt] of deliveries) {
        if (expiresAt <= now) deliveries.delete(storedKey);
      }
      if (deliveries.has(key)) return false;
      deliveries.set(key, now + ttlMs);
      return true;
    },
    release(key) {
      deliveries.delete(key);
    },
  };
}

function appError(
  category: 'validation' | 'authentication' | 'configuration' | 'dependency',
  code:
    | 'INPUT_INVALID'
    | 'AUTH_REQUIRED'
    | 'CONFIG_INVALID'
    | 'DEPENDENCY_UNAVAILABLE',
  message: string,
  status: number,
  reportable: boolean,
  retryable: boolean,
  cause?: unknown,
): AppError {
  return new AppError({
    category,
    cause,
    code,
    message,
    reportable,
    retryable,
    status,
  });
}

function inputError(): AppError {
  return appError(
    'validation',
    'INPUT_INVALID',
    'Webhook input is invalid.',
    400,
    false,
    false,
  );
}

function authenticationError(): AppError {
  return appError(
    'authentication',
    'AUTH_REQUIRED',
    'Webhook authentication failed.',
    401,
    false,
    false,
  );
}

function configurationError(): AppError {
  return appError(
    'configuration',
    'CONFIG_INVALID',
    'Publishing is unavailable.',
    503,
    true,
    false,
  );
}

function dependencyError(): AppError {
  return appError(
    'dependency',
    'DEPENDENCY_UNAVAILABLE',
    'Publishing is temporarily unavailable.',
    503,
    true,
    true,
  );
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

async function readBoundedBody(request: Request): Promise<string> {
  const contentLength = request.headers.get('content-length');
  if (
    contentLength &&
    (!/^\d+$/.test(contentLength) || Number(contentLength) > maximumBodyBytes)
  ) {
    throw inputError();
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximumBodyBytes) {
      await reader.cancel();
      throw inputError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function parsePayload(rawBody: string, now: number): StrapiWebhookPayload {
  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    throw inputError();
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw inputError();
  }
  const record = value as Record<string, unknown>;
  if (typeof record.createdAt !== 'string') {
    throw inputError();
  }
  const createdAt = Date.parse(record.createdAt);
  if (
    !Number.isFinite(createdAt) ||
    Math.abs(now - createdAt) > eventToleranceMs
  ) {
    throw inputError();
  }
  const rawEvents = Array.isArray(record.events)
    ? record.events
    : [{ event: record.event, model: record.model }];
  if (rawEvents.length === 0 || rawEvents.length > 100) throw inputError();
  const events = rawEvents.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw inputError();
    }
    const event = value as Record<string, unknown>;
    if (
      typeof event.event !== 'string' ||
      !allowedEvents.has(event.event) ||
      typeof event.model !== 'string' ||
      !allowedModels.has(event.model)
    ) {
      throw inputError();
    }
    return { event: event.event, model: event.model };
  });
  return { createdAt: record.createdAt, events };
}

function isValidConfiguration(secret: string, deployHookUrl: string): boolean {
  if (secret.length < 32) return false;
  try {
    const url = new URL(deployHookUrl);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'api.vercel.com' &&
      url.username === '' &&
      url.password === '' &&
      url.hash === '' &&
      url.pathname.startsWith('/v1/integrations/deploy/')
    );
  } catch {
    return false;
  }
}

function verifySignature(
  rawBody: string,
  timestamp: string,
  deliveryId: string,
  signature: string,
  secret: string,
  now: number,
): boolean {
  const timestampMs = Date.parse(timestamp);
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs(now - timestampMs) > eventToleranceMs ||
    !/^[a-f0-9]{64}$/.test(deliveryId) ||
    !/^sha256=[a-f0-9]{64}$/.test(signature)
  ) {
    return false;
  }
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${deliveryId}.${rawBody}`)
    .digest('hex');
  return secureEqual(signature.slice('sha256='.length), expected);
}

function responseHeaders(requestId: string): HeadersInit {
  return { 'cache-control': 'no-store', 'x-request-id': requestId };
}

export function createStrapiPublishWebhookHandler(
  options: StrapiPublishWebhookOptions,
) {
  const deliveryStore =
    options.deliveryStore ?? createMemoryStrapiDeliveryStore();
  const fetchDependency = options.fetch ?? fetch;
  const now = options.now ?? Date.now;

  return async (request: Request): Promise<Response> => {
    const startedAt = now();
    const requestContext = createRequestContext(request.headers);
    const context = {
      environment: process.env.VERCEL_ENV,
      operation: 'landing.content.publish',
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      requestId: requestContext.requestId,
      route: '/api/webhooks/strapi/publish',
      service: 'landing',
      traceId: requestContext.traceId,
    };
    let claimedDeliveryKey: string | undefined;
    const record = (outcome: LandingServiceOutcome) =>
      recordLandingServiceObservation(options.recorder, {
        at: new Date(startedAt).toISOString(),
        durationMs: Math.max(0, now() - startedAt),
        operation: 'publish.webhook',
        outcome,
      });

    try {
      const signingSecret = options.signingSecret ?? '';
      const deployHookUrl = options.deployHookUrl ?? '';
      if (!isValidConfiguration(signingSecret, deployHookUrl)) {
        throw configurationError();
      }
      const rawBody = await readBoundedBody(request);
      const timestamp = request.headers.get('x-strapi-timestamp') ?? '';
      const deliveryId = request.headers.get('x-strapi-delivery-id') ?? '';
      const signature = request.headers.get('x-strapi-signature') ?? '';
      if (
        !verifySignature(
          rawBody,
          timestamp,
          deliveryId,
          signature,
          signingSecret,
          now(),
        )
      ) {
        throw authenticationError();
      }
      parsePayload(rawBody, now());
      const deliveryKey = deliveryId;
      if (!deliveryStore.claim(deliveryKey, now(), deliveryTtlMs)) {
        record('duplicate');
        return Response.json(
          {
            data: { requestId: requestContext.requestId, status: 'duplicate' },
          },
          { status: 202, headers: responseHeaders(requestContext.requestId) },
        );
      }
      claimedDeliveryKey = deliveryKey;

      let deployResponse: Response;
      try {
        deployResponse = await fetchDependency(deployHookUrl, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(8_000),
        });
      } catch {
        throw dependencyError();
      }
      if (!deployResponse.ok) throw dependencyError();

      record('accepted');
      return Response.json(
        { data: { requestId: requestContext.requestId, status: 'accepted' } },
        { status: 202, headers: responseHeaders(requestContext.requestId) },
      );
    } catch (error) {
      if (claimedDeliveryKey) deliveryStore.release(claimedDeliveryKey);
      const classified = classifyError(error, context);
      if (classified.controlFlow) throw error;
      if (classified.reportable) {
        try {
          options.reporter.report({
            error: classified.error,
            context: {
              ...context,
              errorCode: classified.code,
              fingerprint: classified.fingerprint,
            },
          });
        } catch {
          // Telemetry must never replace the webhook response.
        }
      }
      const outcome: LandingServiceOutcome =
        classified.code === 'INPUT_INVALID'
          ? 'input_rejected'
          : classified.code === 'AUTH_REQUIRED'
            ? 'auth_rejected'
            : classified.code === 'CONFIG_INVALID'
              ? 'configuration_failed'
              : classified.code === 'DEPENDENCY_UNAVAILABLE'
                ? 'dependency_failed'
                : 'internal_failed';
      record(outcome);
      return Response.json(
        { error: toPublicError(classified) },
        {
          status: classified.status,
          headers: responseHeaders(requestContext.requestId),
        },
      );
    }
  };
}
