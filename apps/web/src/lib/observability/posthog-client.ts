import posthog from 'posthog-js';

export type SafePostHogProperties = Partial<{
  error_code: string;
  error_category: string;
  service: string;
  environment: string;
  release: string;
  route_template: string;
  operation: string;
  request_id: string;
  trace_id: string;
  fingerprint: string;
  retryable: boolean;
  severity: string;
}>;

export interface PostHogSdk {
  init(token: string, config: Record<string, unknown>): unknown;
  captureException(error: unknown, properties?: SafePostHogProperties): unknown;
  identify(distinctId: string): void;
  reset(): void;
}

const safePropertyNames = new Set<keyof SafePostHogProperties>([
  'error_code',
  'error_category',
  'service',
  'environment',
  'release',
  'route_template',
  'operation',
  'request_id',
  'trace_id',
  'fingerprint',
  'retryable',
  'severity',
]);

function allowlistProperties(
  properties: Record<string, unknown> | undefined,
): SafePostHogProperties {
  if (!properties) return {};

  return Object.fromEntries(
    Object.entries(properties).filter(([key]) =>
      safePropertyNames.has(key as keyof SafePostHogProperties),
    ),
  ) as SafePostHogProperties;
}

export function createPostHogAdapter(
  client: PostHogSdk,
  key: string | undefined,
  host = 'https://us.i.posthog.com',
  options: { enabled?: boolean; hasConsent?: () => boolean } = {},
) {
  let initialized = false;

  function ensureInitialized() {
    if (
      !key ||
      typeof window === 'undefined' ||
      options.enabled === false ||
      options.hasConsent?.() === false
    )
      return false;
    if (initialized) return true;

    try {
      client.init(key, {
        api_host: host,
        autocapture: false,
        capture_pageview: false,
        capture_unhandled_errors: false,
        capture_console_errors: false,
      });
      initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  return {
    initialize: ensureInitialized,
    captureException(error: unknown, properties?: Record<string, unknown>) {
      if (!ensureInitialized()) return;
      try {
        client.captureException(error, allowlistProperties(properties));
      } catch {
        // Product error handling must not depend on telemetry availability.
      }
    },
    identify(distinctId: string) {
      if (!ensureInitialized() || !distinctId) return;
      try {
        client.identify(distinctId);
      } catch {
        // Identity enrichment is best-effort.
      }
    },
    reset() {
      if (!ensureInitialized()) return;
      try {
        client.reset();
      } catch {
        // Identity reset is best-effort.
      }
    },
  };
}

export const posthogClient = createPostHogAdapter(
  posthog as unknown as PostHogSdk,
  process.env.POSTHOG_KEY,
  process.env.POSTHOG_HOST,
  {
    enabled: process.env.POSTHOG_ENABLED !== 'false',
    hasConsent: () =>
      process.env.POSTHOG_REQUIRE_CONSENT !== 'true' ||
      window.localStorage.getItem('mini-workout:analytics-consent') ===
        'granted',
  },
);
