import type { ErrorReport, ErrorReporter } from './errors';

export interface ErrorScope {
  requestId: string;
  reportOnce(key: string, report: ErrorReport): boolean;
}

export function createErrorScope(
  dependencies: { reporter: ErrorReporter },
  requestId: string,
): ErrorScope {
  const reportedKeys = new Set<string>();

  return {
    requestId,
    reportOnce(key, report) {
      if (reportedKeys.has(key)) return false;
      reportedKeys.add(key);
      try {
        dependencies.reporter.report(report);
      } catch {
        // Telemetry must never alter the application result.
      }
      return true;
    },
  };
}
