import {
  AppError,
  type ErrorReporter,
  classifyError,
  createRequestContext,
} from '@mini-workout/observability';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const strapiPreviewCookieName = 'strapi-preview-perspective';

interface StrapiPreviewHandlerOptions {
  secret?: string;
  now?: () => number;
  reporter?: ErrorReporter;
}

function responseHeaders(requestId: string): HeadersInit {
  return {
    'cache-control': 'private, no-store',
    'x-request-id': requestId,
    'x-robots-tag': 'noindex, nofollow',
  };
}

function configurationError(): AppError {
  return new AppError({
    category: 'configuration',
    code: 'CONFIG_INVALID',
    message: 'Preview is unavailable.',
    reportable: true,
    retryable: false,
    status: 503,
  });
}

function safePath(value: string | null): string | undefined {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    value.includes('\0')
  ) {
    return undefined;
  }
  return value;
}

function signature(
  secret: string,
  expires: string,
  status: string,
  path: string,
) {
  return createHmac('sha256', secret)
    .update(`${expires}.${status}.${path}`)
    .digest('base64url');
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function previewCookie(value: string, maxAge: number): string {
  return [
    `${strapiPreviewCookieName}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function createStrapiPreviewHandler(
  options: StrapiPreviewHandlerOptions,
): (request: Request) => Promise<Response> {
  const now = options.now ?? Date.now;
  return async (request) => {
    const requestContext = createRequestContext(request.headers);
    const headers = responseHeaders(requestContext.requestId);
    const context = {
      environment: process.env.VERCEL_ENV,
      operation: 'landing.preview.strapi.enable',
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      requestId: requestContext.requestId,
      route: '/api/preview/strapi',
      service: 'landing',
      traceId: requestContext.traceId,
    };
    try {
      if (!options.secret) throw configurationError();
      const url = new URL(request.url);
      const path = safePath(url.searchParams.get('path'));
      const status = url.searchParams.get('status');
      const expires = url.searchParams.get('expires');
      const providedSignature = url.searchParams.get('signature');
      const expiresAt = Number(expires);
      if (
        !path ||
        (status !== 'draft' && status !== 'published') ||
        !expires ||
        !Number.isSafeInteger(expiresAt) ||
        expiresAt < now() ||
        expiresAt > now() + 5 * 60_000 ||
        !providedSignature ||
        !secureEqual(
          providedSignature,
          signature(options.secret, expires, status, path),
        )
      ) {
        return new Response('Preview authorization failed.', {
          status: 401,
          headers,
        });
      }

      const cookie =
        status === 'draft'
          ? previewCookie('draft', 60 * 60)
          : previewCookie('', 0);
      return new Response(null, {
        status: 307,
        headers: { ...headers, location: path, 'set-cookie': cookie },
      });
    } catch (error) {
      const classified = classifyError(error, context);
      if (classified.controlFlow) throw error;
      if (classified.reportable && options.reporter) {
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
          // Telemetry must not replace the preview response.
        }
      }
      return new Response(classified.publicMessage, {
        status: classified.status,
        headers,
      });
    }
  };
}

export function signStrapiPreviewRequest(input: {
  secret: string;
  expires: number;
  status: 'draft' | 'published';
  path: string;
}): string {
  return signature(
    input.secret,
    String(input.expires),
    input.status,
    input.path,
  );
}
