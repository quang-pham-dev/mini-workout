import {
  AuthFeatureFlagConfigurationError,
  createAuthFeatureFlagReader,
} from '../src/feature-flags';
import { describe, expect, it, vi } from 'vitest';

const context = { distinctId: 'auth-rollout:test' };

describe('auth feature flag reader', () => {
  it('uses the deterministic local provider outside production', async () => {
    const reader = createAuthFeatureFlagReader({
      NODE_ENV: 'test',
      MW_FEATURE_AUTH_EMAIL_VERIFICATION: '1',
      RESEND_API_KEY: 're_test',
      AUTH_EMAIL_FROM: 'Mini Workout <test@example.test>',
    });

    await expect(
      reader.isEnabled('auth.emailVerification', context),
    ).resolves.toBe(true);
  });

  it('uses PostHog by default in production and falls back to false', async () => {
    const provider = {
      isEnabled: vi.fn().mockRejectedValue(new Error('PostHog unavailable')),
    };
    const createPostHogProvider = vi.fn(() => provider);
    const reader = createAuthFeatureFlagReader(
      {
        NODE_ENV: 'production',
        POSTHOG_SERVER_API_KEY: 'ph_test',
        MW_FEATURE_AUTH_EMAIL_VERIFICATION: '1',
      },
      { createPostHogProvider },
    );

    await expect(
      reader.isEnabled('auth.emailVerification', context),
    ).resolves.toBe(false);
    expect(createPostHogProvider).toHaveBeenCalledOnce();
  });

  it('does not enable remote verification without email delivery config', async () => {
    const reader = createAuthFeatureFlagReader(
      {
        NODE_ENV: 'production',
        POSTHOG_SERVER_API_KEY: 'ph_test',
      },
      {
        createPostHogProvider: () => ({
          isEnabled: vi.fn().mockResolvedValue(true),
        }),
      },
    );

    await expect(
      reader.isEnabled('auth.emailVerification', context),
    ).resolves.toBe(false);
  });

  it('rejects an unknown provider instead of silently changing behavior', () => {
    expect(() =>
      createAuthFeatureFlagReader({
        NODE_ENV: 'production',
        AUTH_FEATURE_FLAG_PROVIDER: 'unknown',
      }),
    ).toThrow(AuthFeatureFlagConfigurationError);
  });
});
