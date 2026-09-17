export type SafeProperties = Partial<{
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
  captureException(error: unknown, properties?: SafeProperties): unknown;
  identify(distinctId: string): void;
  reset(): void;
}

const allowedKeys = new Set<keyof SafeProperties>([
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

function sanitize(properties?: Record<string, unknown>): SafeProperties {
  if (!properties) return {};
  return Object.fromEntries(
    Object.entries(properties).filter(([key]) =>
      allowedKeys.has(key as keyof SafeProperties),
    ),
  ) as SafeProperties;
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
        client.captureException(error, sanitize(properties));
      } catch {
        // Telemetry must not affect the admin request or UI.
      }
    },
    identify(distinctId: string) {
      if (!distinctId || !ensureInitialized()) return;
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
