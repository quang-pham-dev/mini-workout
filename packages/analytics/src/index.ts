import { isProductEventName, sanitizeProductEvent } from './product-events';

export type AnalyticsProperties = Readonly<Record<string, unknown>>;

export type AnalyticsClient = Readonly<{
  initialize: () => boolean;
  capture: (event: string, properties?: AnalyticsProperties) => void;
  captureException: (error: unknown, properties?: AnalyticsProperties) => void;
  identify: (distinctId: string) => void;
  reset: () => void;
  shutdown?: () => Promise<void>;
}>;

export type PostHogBrowserSdk = Readonly<{
  init: (key: string, config: Record<string, unknown>) => unknown;
  capture?: (event: string, properties?: Record<string, unknown>) => unknown;
  captureException: (
    error: unknown,
    properties?: Record<string, unknown>,
  ) => unknown;
  identify: (distinctId: string) => void;
  reset: () => void;
}>;

const allowedPropertyNames = new Set([
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

function sanitizeProperties(properties: AnalyticsProperties | undefined) {
  if (!properties) return {};
  return Object.fromEntries(
    Object.entries(properties).filter(([key]) => allowedPropertyNames.has(key)),
  );
}

function createSanitizedException(
  properties: AnalyticsProperties | undefined,
): Error {
  const sanitized = sanitizeProperties(properties);
  const code =
    typeof sanitized.error_code === 'string'
      ? sanitized.error_code
      : 'INTERNAL_ERROR';
  return new Error(code);
}

export function createNoopAnalytics(): AnalyticsClient {
  return {
    initialize: () => false,
    capture: () => undefined,
    captureException: () => undefined,
    identify: () => undefined,
    reset: () => undefined,
  };
}

export function createPostHogBrowserAdapter(
  client: PostHogBrowserSdk,
  key: string | undefined,
  host = 'https://us.i.posthog.com',
  options: { enabled?: boolean; hasConsent?: () => boolean } = {},
): AnalyticsClient {
  let initialized = false;

  const ensureInitialized = () => {
    if (
      !key ||
      typeof window === 'undefined' ||
      options.enabled === false ||
      options.hasConsent?.() === false
    ) {
      return false;
    }
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
  };

  return {
    initialize: ensureInitialized,
    capture: (event, properties) => {
      if (!ensureInitialized()) return;
      try {
        const sanitized = isProductEventName(event)
          ? sanitizeProductEvent(event, properties ?? {})
          : sanitizeProperties(properties);
        if (!sanitized) return;
        client.capture?.(event, sanitized);
      } catch {
        // Analytics must never change the application response.
      }
    },
    captureException: (_error, properties) => {
      if (!ensureInitialized()) return;
      try {
        client.captureException(
          createSanitizedException(properties),
          sanitizeProperties(properties),
        );
      } catch {
        // Analytics must never change the application response.
      }
    },
    identify: (distinctId) => {
      if (!distinctId || !ensureInitialized()) return;
      try {
        client.identify(distinctId);
      } catch {
        // Identity enrichment is best-effort.
      }
    },
    reset: () => {
      if (!ensureInitialized()) return;
      try {
        client.reset();
      } catch {
        // Identity reset is best-effort.
      }
    },
  };
}
