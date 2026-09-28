import {
  AppError,
  type ErrorReporter,
  classifyError,
  createRequestContext,
  toPublicError,
} from '@mini-workout/observability';
import { createHmac, timingSafeEqual } from 'node:crypto';

const maximumBodyBytes = 64 * 1024;
const signatureToleranceMs = 5 * 60 * 1000;
const deliveryTtlMs = 10 * 60 * 1000;
const deliveryKeyPattern = /^[A-Za-z0-9._:-]{1,200}$/;

export interface DeliveryStore {
  claim(key: string, now: number, ttlMs: number): boolean;
  release(key: string): void;
}

interface PublishWebhookOptions {
  webhookSecret?: string;
  deployHookUrl?: string;
  deliveryStore?: DeliveryStore;
  fetch?: typeof fetch;
  now?: () => number;
  reporter: ErrorReporter;
}

export function createMemoryDeliveryStore(): DeliveryStore {
  const deliveries = new Map<string, number>();

  return {
    claim: (key, now, ttlMs) => {
      for (const [storedKey, expiresAt] of deliveries) {
        if (expiresAt <= now) deliveries.delete(storedKey);
      }
      if (deliveries.has(key)) return false;
      deliveries.set(key, now + ttlMs);
      return true;
    },
    release: (key) => {
      deliveries.delete(key);
    },
  };
}

function inputError(): AppError {
  return new AppError({
    category: 'validation',
    code: 'INPUT_INVALID',
    message: 'Webhook input is invalid.',
    reportable: false,
    retryable: false,
    status: 400,
  });
}

function authenticationError(): AppError {
  return new AppError({
    category: 'authentication',
    code: 'AUTH_REQUIRED',
    message: 'Webhook authentication failed.',
    reportable: false,
    retryable: false,
    status: 401,
  });
}

function configurationError(): AppError {
  return new AppError({
    category: 'configuration',
    code: 'CONFIG_INVALID',
    message: 'Publishing is unavailable.',
    reportable: true,
    retryable: false,
    status: 503,
  });
}

function dependencyError(cause?: unknown): AppError {
  return new AppError({
    category: 'dependency',
    code: 'DEPENDENCY_UNAVAILABLE',
    message: 'Publishing is temporarily unavailable.',
    reportable: true,
    retryable: true,
    status: 503,
    cause,
  });
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

function verifySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  now: number,
): boolean {
  const values = Object.fromEntries(
    signatureHeader.split(',').flatMap((part) => {
      const separator = part.indexOf('=');
      return separator > 0
        ? [[part.slice(0, separator), part.slice(separator + 1)]]
        : [];
    }),
  );
  const timestamp = values.t;
  const signature = values.v1;
  if (!timestamp || !/^\d+$/.test(timestamp) || !signature) return false;

  const signedAt = Number(timestamp) * 1000;
  if (!Number.isSafeInteger(signedAt)) return false;
  if (Math.abs(now - signedAt) > signatureToleranceMs) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, 'base64url');
  } catch {
    return false;
  }
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

function validateJsonObject(rawBody: string): void {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw inputError();
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw inputError();
  }
}

function responseHeaders(requestId: string): HeadersInit {
  return { 'cache-control': 'no-store', 'x-request-id': requestId };
}

export function createPublishWebhookHandler(options: PublishWebhookOptions) {
  const deliveryStore = options.deliveryStore ?? createMemoryDeliveryStore();
  const fetchDependency = options.fetch ?? fetch;
  const now = options.now ?? Date.now;

  return async (request: Request): Promise<Response> => {
    const requestContext = createRequestContext(request.headers);
    const context = {
      environment: process.env.VERCEL_ENV,
      operation: 'landing.content.publish',
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      requestId: requestContext.requestId,
      route: '/api/webhooks/sanity/publish',
      service: 'landing',
      traceId: requestContext.traceId,
    };
    let claimedDeliveryKey: string | undefined;

    try {
      const webhookSecret = options.webhookSecret ?? '';
      const deployHookUrl = options.deployHookUrl ?? '';
      if (!isValidConfiguration(webhookSecret, deployHookUrl)) {
        throw configurationError();
      }

      const rawBody = await readBoundedBody(request);
      if (
        !verifySignature(
          rawBody,
          request.headers.get('sanity-webhook-signature') ?? '',
          webhookSecret,
          now(),
        )
      ) {
        throw authenticationError();
      }

      const deliveryKey = request.headers.get('idempotency-key') ?? '';
      if (!deliveryKeyPattern.test(deliveryKey)) throw inputError();
      validateJsonObject(rawBody);

      if (!deliveryStore.claim(deliveryKey, now(), deliveryTtlMs)) {
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
      } catch (cause) {
        throw dependencyError(cause);
      }
      if (!deployResponse.ok) throw dependencyError();

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
