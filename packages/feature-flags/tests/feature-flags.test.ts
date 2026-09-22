import {
  FEATURE_FLAG_REGISTRY,
  createFeatureFlagReader,
  createLocalFeatureFlagProvider,
  isFeatureEnabled,
  parseFeatureFlags,
} from '../src';
import { describe, expect, it } from 'vitest';

describe('feature flags', () => {
  it('keeps ownership and cleanup metadata beside every stable key', () => {
    expect(FEATURE_FLAG_REGISTRY['auth.emailVerification']).toMatchObject({
      owner: 'auth-platform',
      defaultValue: false,
      kind: 'release',
    });
    expect(FEATURE_FLAG_REGISTRY['auth.emailVerification'].reviewAfter).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it('defaults email verification to disabled', () => {
    const flags = parseFeatureFlags({});

    expect(flags.emailVerification).toBe(false);
    expect(isFeatureEnabled(flags, 'auth.emailVerification')).toBe(false);
  });

  it('accepts only the explicit enabled value', () => {
    const flags = parseFeatureFlags({
      MW_FEATURE_AUTH_EMAIL_VERIFICATION: '1',
    });

    expect(isFeatureEnabled(flags, 'auth.emailVerification')).toBe(true);
    expect(
      parseFeatureFlags({ MW_FEATURE_AUTH_EMAIL_VERIFICATION: '0' })
        .emailVerification,
    ).toBe(false);
  });

  it('rejects truthy values that could accidentally enable a security feature', () => {
    expect(() =>
      parseFeatureFlags({ MW_FEATURE_AUTH_EMAIL_VERIFICATION: 'true' }),
    ).toThrow('must be either 0 or 1');
  });

  it('uses the local provider without a network dependency', async () => {
    const config = parseFeatureFlags({
      MW_FEATURE_AUTH_EMAIL_VERIFICATION: '1',
    });
    const reader = createFeatureFlagReader(
      createLocalFeatureFlagProvider(config),
      parseFeatureFlags({}),
    );

    await expect(
      reader.isEnabled('auth.emailVerification', { distinctId: 'test-user' }),
    ).resolves.toBe(true);
  });

  it('falls back safely when a remote provider is unavailable', async () => {
    const reader = createFeatureFlagReader(
      {
        isEnabled: async () => {
          throw new Error('provider unavailable');
        },
      },
      parseFeatureFlags({}),
    );

    await expect(
      reader.isEnabled('auth.emailVerification', { distinctId: 'test-user' }),
    ).resolves.toBe(false);
  });
});
