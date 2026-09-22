import type { ErrorReporter } from './errors';
import type { LogContext } from './logger';
import { createPostHogServerClient } from '@mini-workout/analytics/server';

type ServerPostHogOptions = {
  apiKey?: string;
  host?: string;
  distinctId?: string;
  fetcher?: typeof fetch;
};

const allowedContext = new Set([
  'errorCode',
  'errorCategory',
  'service',
  'environment',
  'release',
  'routeTemplate',
  'operation',
  'requestId',
  'traceId',
  'fingerprint',
  'retryable',
  'severity',
]);

function toProperties(context: LogContext | undefined) {
  return Object.fromEntries(
    Object.entries(context ?? {})
      .filter(([key]) => allowedContext.has(key))
      .map(([key, value]) => [
        key.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`),
        value,
      ]),
  );
}

export function createPostHogServerReporter(
  options: ServerPostHogOptions,
): ErrorReporter {
  if (!options.fetcher) {
    const analytics = createPostHogServerClient({
      apiKey: options.apiKey,
      host: options.host,
    });
    return {
      report: ({ error, context }) => {
        analytics.captureException(error, context);
      },
    };
  }

  const fetcher = options.fetcher ?? fetch;
  const endpoint = `${options.host ?? 'https://us.i.posthog.com'}/capture/`;

  return {
    report: ({ error, context }) => {
      if (!options.apiKey) return;
      const properties = {
        ...toProperties(context),
        $exception_type: error.name,
      };

      void fetcher(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          api_key: options.apiKey,
          event: '$exception',
          distinct_id: options.distinctId ?? context?.requestId ?? 'server',
          properties,
        }),
      }).catch(() => {
        // Telemetry must never affect the application request.
      });
    },
  };
}
