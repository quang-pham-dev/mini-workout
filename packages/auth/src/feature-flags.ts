import { assertAuthEmailConfiguration } from './email';
import { createPostHogFeatureFlagProviderFromConfig } from '@mini-workout/analytics/server';
import {
  type FeatureFlagProvider,
  type FeatureFlagReader,
  createFeatureFlagReader,
  createLocalFeatureFlagProvider,
  parseFeatureFlags,
} from '@mini-workout/feature-flags';

type AuthFeatureFlagEnvironment = Readonly<Record<string, string | undefined>>;

type AuthFeatureFlagProviderName = 'local' | 'posthog';

type CreatePostHogProvider = (
  options: Parameters<typeof createPostHogFeatureFlagProviderFromConfig>[0],
) => FeatureFlagProvider;

export class AuthFeatureFlagConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthFeatureFlagConfigurationError';
  }
}

function getProviderName(
  env: AuthFeatureFlagEnvironment,
): AuthFeatureFlagProviderName {
  const configured = env.AUTH_FEATURE_FLAG_PROVIDER?.trim();
  if (!configured) return env.NODE_ENV === 'production' ? 'posthog' : 'local';
  if (configured === 'local' || configured === 'posthog') return configured;
  throw new AuthFeatureFlagConfigurationError(
    `Unsupported auth feature flag provider: ${configured}`,
  );
}

function hasEmailConfiguration(env: AuthFeatureFlagEnvironment) {
  return Boolean(env.RESEND_API_KEY?.trim() && env.AUTH_EMAIL_FROM?.trim());
}

export function createAuthFeatureFlagReader(
  env: AuthFeatureFlagEnvironment = process.env,
  dependencies: Readonly<{
    createPostHogProvider?: CreatePostHogProvider;
  }> = {},
): FeatureFlagReader {
  const providerName = getProviderName(env);

  if (providerName === 'local') {
    const config = parseFeatureFlags(env);
    if (config.emailVerification) assertAuthEmailConfiguration(env);
    return createFeatureFlagReader(
      createLocalFeatureFlagProvider(config),
      config,
    );
  }

  const createPostHogProvider =
    dependencies.createPostHogProvider ??
    createPostHogFeatureFlagProviderFromConfig;
  const reader = createFeatureFlagReader(
    createPostHogProvider({
      apiKey: env.POSTHOG_SERVER_API_KEY,
      host: env.POSTHOG_HOST,
      keyMap: {
        'auth.emailVerification':
          env.POSTHOG_AUTH_EMAIL_VERIFICATION_FLAG_KEY?.trim() ||
          'auth-email-verification',
      },
      timeoutMs: 3_000,
      cacheTtlMs: 45_000,
    }),
    { emailVerification: false },
  );

  return {
    isEnabled: async (key, context) => {
      const enabled = await reader.isEnabled(key, context);
      return enabled && hasEmailConfiguration(env);
    },
  };
}

export const authFeatureFlagReader = createAuthFeatureFlagReader();
