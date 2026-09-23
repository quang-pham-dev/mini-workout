import {
  type ErrorContext,
  type ErrorReporter,
  classifyError,
  createLogger,
  createLoggerErrorReporter,
  createPostHogServerReporter,
} from '@mini-workout/observability';

const logger = createLogger({ service: 'admin' });
const loggerReporter = createLoggerErrorReporter(logger);
const postHogReporter = createPostHogServerReporter({
  apiKey: process.env.ADMIN_POSTHOG_SERVER_API_KEY,
  host: process.env.ADMIN_POSTHOG_HOST,
});
const defaultReporter = {
  report: (report: Parameters<typeof loggerReporter.report>[0]) => {
    loggerReporter.report(report);
    postHogReporter.report(report);
  },
};

export function reportAdminServerFunctionError(
  error: unknown,
  operation: string,
  reporter: ErrorReporter = defaultReporter,
  context: Omit<ErrorContext, 'service' | 'operation'> = {},
) {
  const classified = classifyError(error, {
    ...context,
    service: 'admin',
    operation,
  });

  if (classified.controlFlow || !classified.reportable) return classified;

  try {
    reporter.report({
      error: classified.error,
      context: {
        ...context,
        service: 'admin',
        operation,
        errorCode: classified.code,
        fingerprint: classified.fingerprint,
      },
    });
  } catch {
    // Telemetry must never replace the server-function failure.
  }

  return classified;
}
