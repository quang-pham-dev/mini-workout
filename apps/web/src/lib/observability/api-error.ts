import {
  type ErrorReporter,
  classifyError,
  createLogger,
  createLoggerErrorReporter,
  createPostHogServerReporter,
  createRequestContext,
  toPublicError,
} from '@mini-workout/observability';

const logger = createLogger({ service: 'web' });
const loggerReporter = createLoggerErrorReporter(logger);
const postHogReporter = createPostHogServerReporter({
  apiKey: process.env.POSTHOG_SERVER_API_KEY,
  host: process.env.POSTHOG_HOST,
});
const defaultReporter = {
  report: (report: Parameters<typeof loggerReporter.report>[0]) => {
    loggerReporter.report(report);
    postHogReporter.report(report);
  },
};

export function createApiErrorResponse(
  error: unknown,
  request: Request,
  operation: string,
  reporter: ErrorReporter = defaultReporter,
): Response {
  const requestContext = createRequestContext(request.headers);
  const classified = classifyError(error, {
    service: 'web',
    operation,
    route: new URL(request.url).pathname,
    requestId: requestContext.requestId,
    traceId: requestContext.traceId,
  });

  if (classified.controlFlow) throw error;

  if (classified.reportable) {
    try {
      reporter.report({
        error: classified.error,
        context: {
          service: 'web',
          operation,
          route: new URL(request.url).pathname,
          requestId: requestContext.requestId,
          traceId: requestContext.traceId,
          errorCode: classified.code,
          fingerprint: classified.fingerprint,
        },
      });
    } catch {
      // Telemetry must never replace the API response.
    }
  }

  return Response.json(
    { error: toPublicError(classified) },
    {
      status: classified.status,
      headers: {
        'cache-control': 'no-store',
        'x-request-id': requestContext.requestId,
      },
    },
  );
}
