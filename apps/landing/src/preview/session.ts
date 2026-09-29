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
} from '@mini-workout/observability';

export const previewCookieName = 'sanity-preview-perspective';

interface PreviewValidationResult {
  isValid: boolean;
  redirectTo?: string;
  studioPreviewPerspective?: string | null;
}

type PreviewValidator = (
  previewUrl: string,
) => Promise<PreviewValidationResult>;

interface PreviewHandlerDependencies {
  projectId?: string;
  dataset?: string;
  token?: string;
  createValidator: (config: {
    projectId: string;
    dataset: string;
    token: string;
  }) => PreviewValidator;
  now?: () => number;
  recorder?: LandingServiceObservationRecorder;
  reporter?: ErrorReporter;
}

const privateNoStoreHeaders = {
  'cache-control': 'private, no-store',
  'x-robots-tag': 'noindex, nofollow',
} as const;

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

function dependencyError(cause: unknown): AppError {
  return new AppError({
    category: 'dependency',
    code: 'DEPENDENCY_UNAVAILABLE',
    message: 'Preview is temporarily unavailable.',
    reportable: true,
    retryable: true,
    status: 503,
    cause,
  });
}

function responseHeaders(requestId: string): HeadersInit {
  return { ...privateNoStoreHeaders, 'x-request-id': requestId };
}

function safeRedirectPath(value: string | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return '/';
  }
  return value;
}

function previewCookie(value: string, maxAge: number): string {
  return [
    `${previewCookieName}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function createEnablePreviewHandler(
  dependencies: PreviewHandlerDependencies,
): (request: Request) => Promise<Response> {
  const now = dependencies.now ?? Date.now;
  return async (request) => {
    const startedAt = now();
    const requestContext = createRequestContext(request.headers);
    const context = {
      environment: process.env.VERCEL_ENV,
      operation: 'landing.preview.enable',
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      requestId: requestContext.requestId,
      route: '/api/draft-mode/enable',
      service: 'landing',
      traceId: requestContext.traceId,
    };
    const record = (outcome: LandingServiceOutcome) =>
      recordLandingServiceObservation(dependencies.recorder, {
        at: new Date(startedAt).toISOString(),
        durationMs: Math.max(0, now() - startedAt),
        operation: 'preview.enable',
        outcome,
      });
    const { projectId, dataset, token } = dependencies;

    try {
      if (!projectId || !dataset || !token) throw configurationError();
      let result: PreviewValidationResult;
      try {
        const validate = dependencies.createValidator({
          projectId,
          dataset,
          token,
        });
        result = await validate(request.url);
      } catch (cause) {
        throw dependencyError(cause);
      }
      if (!result.isValid) {
        record('auth_rejected');
        return new Response('Preview authorization failed.', {
          status: 401,
          headers: responseHeaders(requestContext.requestId),
        });
      }

      const perspective = result.studioPreviewPerspective || 'drafts';
      record('success');
      return new Response(null, {
        status: 307,
        headers: {
          ...responseHeaders(requestContext.requestId),
          location: safeRedirectPath(result.redirectTo),
          'set-cookie': previewCookie(perspective, 60 * 60),
        },
      });
    } catch (error) {
      const classified = classifyError(error, context);
      if (classified.controlFlow) throw error;
      if (classified.reportable && dependencies.reporter) {
        try {
          dependencies.reporter.report({
            error: classified.error,
            context: {
              ...context,
              errorCode: classified.code,
              fingerprint: classified.fingerprint,
            },
          });
        } catch {
          // Error reporting remains best-effort.
        }
      }
      const isConfiguration = classified.code === 'CONFIG_INVALID';
      record(isConfiguration ? 'configuration_failed' : 'dependency_failed');
      return new Response(classified.publicMessage, {
        status: classified.status,
        headers: responseHeaders(requestContext.requestId),
      });
    }
  };
}

export function createDisablePreviewResponse(): Response {
  return new Response(null, {
    status: 307,
    headers: {
      ...privateNoStoreHeaders,
      location: '/',
      'set-cookie': previewCookie('', 0),
    },
  });
}

export function getPreviewState(request: Request): {
  enabled: boolean;
  noindex: true;
} {
  const cookie = request.headers.get('cookie') ?? '';
  const enabled = cookie
    .split(';')
    .some((part) => part.trim().startsWith(`${previewCookieName}=`));
  return { enabled, noindex: true };
}
