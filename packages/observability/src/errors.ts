import type { LogContext, Logger } from './logger';

export interface ErrorReport {
  error: Error;
  context?: LogContext;
}

export interface ErrorReporter {
  report(report: ErrorReport): void;
}

export function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function createLoggerErrorReporter(logger: Logger): ErrorReporter {
  return {
    report: ({ error, context }) =>
      logger.error('Unhandled application error', error, context),
  };
}
