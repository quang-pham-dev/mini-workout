import {
  type AnalyticsClient,
  type AnalyticsProperties,
  createNoopAnalytics,
} from './index';
import type {
  FeatureFlagKey,
  FeatureFlagProvider,
} from '@mini-workout/feature-flags';
import { PostHog } from 'posthog-node';

type PostHogServerClient = Readonly<{
  capture: (event: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }) => void;
  captureException: (
    error: unknown,
    distinctId?: string,
    properties?: Record<string, unknown>,
  ) => void;
  identify: (properties: {
    distinctId: string;
    properties?: Record<string, unknown>;
  }) => void;
  reset?: () => void;
  getFeatureFlag: (
    key: string,
    distinctId: string,
  ) => Promise<boolean | string | undefined>;
  shutdown: (timeout?: number) => Promise<void>;
}>;

const allowedProperties = new Set([
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

function safeProperties(properties: AnalyticsProperties | undefined) {
  return Object.fromEntries(
    Object.entries(properties ?? {}).filter(([key]) =>
      allowedProperties.has(key),
    ),
  );
}

function createSanitizedException(
  properties: AnalyticsProperties | undefined,
): Error {
  const sanitized = safeProperties(properties);
  return new Error(
    typeof sanitized.error_code === 'string'
      ? sanitized.error_code
      : 'INTERNAL_ERROR',
  );
}

export function createPostHogServerAnalytics(
  client: PostHogServerClient,
): AnalyticsClient {
  return {
    initialize: () => true,
    capture: (event, properties) => {
      try {
        client.capture({
          distinctId:
            typeof properties?.request_id === 'string'
              ? properties.request_id
              : `server:${crypto.randomUUID()}`,
          event,
          properties: safeProperties(properties),
        });
      } catch {
        // Analytics is best-effort.
      }
    },
    captureException: (_error, properties) => {
      try {
        const sanitized = safeProperties(properties);
        client.captureException(
          createSanitizedException(sanitized),
          typeof sanitized.request_id === 'string'
            ? sanitized.request_id
            : `server:${crypto.randomUUID()}`,
          sanitized,
        );
      } catch {
        // Analytics is best-effort.
      }
    },
    identify: (distinctId) => {
      if (!distinctId) return;
      try {
        client.identify({ distinctId });
      } catch {
        // Identity enrichment is best-effort.
      }
    },
    reset: () => client.reset?.(),
    shutdown: () => client.shutdown(5_000),
  };
}

export function createPostHogServerClient(options: {
  apiKey?: string;
  host?: string;
}): AnalyticsClient {
  if (!options.apiKey) return createNoopAnalytics();

  const client = new PostHog(options.apiKey, {
    host: options.host ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  });
  return createPostHogServerAnalytics(client);
}

export function createPostHogFeatureFlagProvider(
  client: Pick<PostHogServerClient, 'getFeatureFlag'>,
  keyMap: Readonly<Record<FeatureFlagKey, string>>,
  timeoutMs = 3_000,
  cacheTtlMs = 45_000,
  maxCacheEntries = 10_000,
): FeatureFlagProvider {
  const cache = new Map<string, { value: boolean; expiresAt: number }>();
  const inFlight = new Map<string, Promise<boolean>>();

  const setCachedValue = (key: string, value: boolean) => {
    cache.delete(key);
    cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
    while (cache.size > Math.max(1, maxCacheEntries)) {
      const oldestKey = cache.keys().next().value;
      if (typeof oldestKey !== 'string') break;
      cache.delete(oldestKey);
    }
  };

  return {
    isEnabled: async (key, context) => {
      const providerKey = keyMap[key];
      if (!providerKey || !context.distinctId) return false;
      const cacheKey = `${providerKey}:${context.distinctId}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        cache.delete(cacheKey);
        cache.set(cacheKey, cached);
        return cached.value;
      }
      if (cached) cache.delete(cacheKey);

      const pending = inFlight.get(cacheKey);
      if (pending) return pending;

      const evaluation = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), timeoutMs);
        void client
          .getFeatureFlag(providerKey, context.distinctId)
          .then(
            (result) => resolve(result === true),
            () => resolve(false),
          )
          .finally(() => clearTimeout(timeout));
      })
        .then((value) => {
          setCachedValue(cacheKey, value);
          return value;
        })
        .finally(() => inFlight.delete(cacheKey));

      inFlight.set(cacheKey, evaluation);
      return evaluation;
    },
  };
}

export function createPostHogFeatureFlagProviderFromConfig(options: {
  apiKey?: string;
  host?: string;
  keyMap: Readonly<Record<FeatureFlagKey, string>>;
  timeoutMs?: number;
  cacheTtlMs?: number;
}): FeatureFlagProvider {
  if (!options.apiKey?.trim()) {
    return { isEnabled: async () => false };
  }

  const client = new PostHog(options.apiKey, {
    host: options.host ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  });

  return createPostHogFeatureFlagProvider(
    client,
    options.keyMap,
    options.timeoutMs,
    options.cacheTtlMs,
  );
}
