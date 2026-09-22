import {
  createPostHogFeatureFlagProvider,
  createPostHogFeatureFlagProviderFromConfig,
  createPostHogServerAnalytics,
} from '../src/server';
import { describe, expect, it, vi } from 'vitest';

describe('server feature flag provider', () => {
  it('maps the stable application key and evaluates a boolean flag', async () => {
    const getFeatureFlag = vi.fn().mockResolvedValue(true);
    const provider = createPostHogFeatureFlagProvider(
      { getFeatureFlag },
      { 'auth.emailVerification': 'auth-email-verification' },
    );

    await expect(
      provider.isEnabled('auth.emailVerification', { distinctId: 'user-1' }),
    ).resolves.toBe(true);
    expect(getFeatureFlag).toHaveBeenCalledWith(
      'auth-email-verification',
      'user-1',
    );
  });

  it('returns false for unavailable or non-boolean flag values', async () => {
    const provider = createPostHogFeatureFlagProvider(
      { getFeatureFlag: vi.fn().mockRejectedValue(new Error('offline')) },
      { 'auth.emailVerification': 'auth-email-verification' },
    );

    await expect(
      provider.isEnabled('auth.emailVerification', { distinctId: 'user-1' }),
    ).resolves.toBe(false);
  });

  it('caches decisions within the rollout TTL', async () => {
    const getFeatureFlag = vi.fn().mockResolvedValue(true);
    const provider = createPostHogFeatureFlagProvider(
      { getFeatureFlag },
      { 'auth.emailVerification': 'auth-email-verification' },
      3_000,
      45_000,
    );

    await provider.isEnabled('auth.emailVerification', {
      distinctId: 'user-1',
    });
    await provider.isEnabled('auth.emailVerification', {
      distinctId: 'user-1',
    });

    expect(getFeatureFlag).toHaveBeenCalledOnce();
  });

  it('coalesces concurrent evaluations for the same identity', async () => {
    let resolveFlag: ((value: boolean) => void) | undefined;
    const getFeatureFlag = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveFlag = resolve;
        }),
    );
    const provider = createPostHogFeatureFlagProvider(
      { getFeatureFlag },
      { 'auth.emailVerification': 'auth-email-verification' },
    );

    const first = provider.isEnabled('auth.emailVerification', {
      distinctId: 'user-1',
    });
    const second = provider.isEnabled('auth.emailVerification', {
      distinctId: 'user-1',
    });
    resolveFlag?.(true);

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(getFeatureFlag).toHaveBeenCalledOnce();
  });

  it('bounds the in-memory decision cache for long-lived runtimes', async () => {
    const getFeatureFlag = vi.fn().mockResolvedValue(true);
    const provider = createPostHogFeatureFlagProvider(
      { getFeatureFlag },
      { 'auth.emailVerification': 'auth-email-verification' },
      3_000,
      45_000,
      2,
    );

    for (const distinctId of ['user-1', 'user-2', 'user-3', 'user-1']) {
      await provider.isEnabled('auth.emailVerification', { distinctId });
    }

    expect(getFeatureFlag).toHaveBeenCalledTimes(4);
  });

  it('uses a no-network disabled provider when the server key is missing', async () => {
    const provider = createPostHogFeatureFlagProviderFromConfig({
      keyMap: { 'auth.emailVerification': 'auth-email-verification' },
    });

    await expect(
      provider.isEnabled('auth.emailVerification', { distinctId: 'user-1' }),
    ).resolves.toBe(false);
  });

  it('allowlists server analytics properties', () => {
    const captureException = vi.fn();
    const analytics = createPostHogServerAnalytics({
      capture: vi.fn(),
      captureException,
      identify: vi.fn(),
      shutdown: vi.fn().mockResolvedValue(undefined),
      getFeatureFlag: vi.fn(),
    });

    analytics.captureException(new Error('private'), {
      error_code: 'INTERNAL_ERROR',
      request_id: 'request-1',
      email: 'must-not-send',
    });

    const [error, distinctId, properties] = captureException.mock.calls[0]!;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('INTERNAL_ERROR');
    expect(error.message).not.toContain('private');
    expect(distinctId).toBe('request-1');
    expect(properties).toEqual({
      error_code: 'INTERNAL_ERROR',
      request_id: 'request-1',
    });
  });
});
