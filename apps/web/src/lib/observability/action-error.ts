import {
  type ErrorContext,
  type ErrorReporter,
  classifyError,
  createLogger,
  createLoggerErrorReporter,
  createPostHogServerReporter,
  createReportOnce,
  createRequestContext,
} from '@mini-workout/observability';
import { headers } from 'next/headers';

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

export interface ServerActionErrorDependencies {
  reporter?: ErrorReporter;
  createContext?: (operation: string) => Promise<ErrorContext>;
}

async function defaultCreateContext(operation: string): Promise<ErrorContext> {
  const requestContext = createRequestContext(await headers());
  return {
    service: 'web',
    operation,
    requestId: requestContext.requestId,
    traceId: requestContext.traceId,
  };
}

export async function withServerActionErrorBoundary<T>(
  operation: string,
  action: () => Promise<T>,
  dependencies: ServerActionErrorDependencies = {},
): Promise<T> {
  const context = await (dependencies.createContext ?? defaultCreateContext)(
    operation,
  );
  const reporter = createReportOnce(dependencies.reporter ?? defaultReporter);

  try {
    return await action();
  } catch (error) {
    const classified = classifyError(error, context);
    if (!classified.controlFlow && classified.reportable) {
      reporter.report({
        error: classified.error,
        context: {
          ...context,
          errorCode: classified.code,
          fingerprint: classified.fingerprint,
        },
      });
    }
    throw error;
  }
}
