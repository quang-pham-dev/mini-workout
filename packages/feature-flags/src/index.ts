export type FeatureFlagKey = 'auth.emailVerification';

export type FeatureFlagMetadata = Readonly<{
  owner: string;
  purpose: string;
  kind: 'release' | 'experiment' | 'operational';
  defaultValue: boolean;
  reviewAfter: string;
}>;

export const FEATURE_FLAG_REGISTRY = {
  'auth.emailVerification': {
    owner: 'auth-platform',
    purpose: 'Roll out verified-email enforcement for member authentication',
    kind: 'release',
    defaultValue: false,
    reviewAfter: '2026-12-31',
  },
} as const satisfies Readonly<Record<FeatureFlagKey, FeatureFlagMetadata>>;

export type FeatureFlagContext = Readonly<{
  distinctId: string;
  properties?: Readonly<Record<string, string | number | boolean>>;
}>;

export interface FeatureFlagProvider {
  isEnabled(key: FeatureFlagKey, context: FeatureFlagContext): Promise<boolean>;
}

export interface FeatureFlagReader {
  isEnabled(key: FeatureFlagKey, context: FeatureFlagContext): Promise<boolean>;
}

export type FeatureFlagConfig = Readonly<{
  emailVerification: boolean;
}>;

const ENABLED = '1';
const DISABLED = '0';

function parseToggle(name: string, value: string | undefined) {
  if (value === undefined || value === '') return false;
  if (value === ENABLED) return true;
  if (value === DISABLED) return false;
  throw new Error(`${name} must be either 0 or 1`);
}

export function parseFeatureFlags(
  env: Record<string, string | undefined>,
): FeatureFlagConfig {
  return {
    emailVerification: parseToggle(
      'MW_FEATURE_AUTH_EMAIL_VERIFICATION',
      env.MW_FEATURE_AUTH_EMAIL_VERIFICATION,
    ),
  };
}

export function isFeatureEnabled(
  config: FeatureFlagConfig,
  key: FeatureFlagKey,
): boolean {
  if (key === 'auth.emailVerification') return config.emailVerification;
  return false;
}

export function createLocalFeatureFlagProvider(
  config: FeatureFlagConfig,
): FeatureFlagProvider {
  return {
    isEnabled: async (key) => isFeatureEnabled(config, key),
  };
}

export function createFeatureFlagReader(
  provider: FeatureFlagProvider,
  fallback: FeatureFlagConfig,
): FeatureFlagReader {
  return {
    isEnabled: async (key, context) => {
      try {
        return await provider.isEnabled(key, context);
      } catch {
        return isFeatureEnabled(fallback, key);
      }
    },
  };
}
