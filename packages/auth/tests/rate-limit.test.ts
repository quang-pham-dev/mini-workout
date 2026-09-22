import {
  AUTH_RATE_LIMIT_RULES,
  AuthRateLimitUnavailableError,
  AuthRateLimitedError,
  createAuthActionRateLimiter,
  getAuthRateLimitOptions,
} from '../src/rate-limit';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { describe, expect, it, vi } from 'vitest';

const disposableDatabaseUrl =
  'postgresql://postgres:postgres@127.0.0.1:5432/mini_workout_e2e';

describe('authentication rate-limit policy', () => {
  it('uses shared database storage and explicit sensitive-route profiles in production', () => {
    expect(getAuthRateLimitOptions({ NODE_ENV: 'production' })).toEqual({
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: AUTH_RATE_LIMIT_RULES,
    });

    expect(AUTH_RATE_LIMIT_RULES).toMatchObject({
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 3 },
      '/send-verification-email': { window: 300, max: 3 },
      '/request-password-reset': { window: 300, max: 3 },
      '/reset-password': { window: 300, max: 5 },
      '/verify-email': { window: 300, max: 10 },
    });
  });

  it('pseudonymizes Better Auth HTTP keys before durable storage', async () => {
    const consume = vi.fn().mockResolvedValue({
      allowed: true,
      retryAfter: null,
    });
    const options = getAuthRateLimitOptions(
      {
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: 'http-rate-limit-secret',
      },
      { consume },
    );
    const rule = AUTH_RATE_LIMIT_RULES['/sign-in/email'];

    await options.customStorage?.consume('203.0.113.8|/sign-in/email', rule);

    expect(consume).toHaveBeenCalledWith(
      expect.stringMatching(/^auth-http:[a-f0-9]{64}$/),
      rule,
    );
    expect(JSON.stringify(consume.mock.calls)).not.toContain('203.0.113.8');
  });

  it('keeps non-production instances local and disabled by default', () => {
    expect(getAuthRateLimitOptions({ NODE_ENV: 'development' })).toMatchObject({
      enabled: false,
      storage: 'memory',
    });
    expect(getAuthRateLimitOptions({ NODE_ENV: 'test' })).toMatchObject({
      enabled: false,
      storage: 'memory',
    });
  });

  it('accepts the bypass only for an explicit matching local disposable database', () => {
    expect(
      getAuthRateLimitOptions({
        NODE_ENV: 'production',
        E2E_AUTH_RATE_LIMIT_DISABLED: '1',
        DATABASE_URL: disposableDatabaseUrl,
        E2E_DATABASE_URL: disposableDatabaseUrl,
      }),
    ).toEqual({ enabled: false });
  });

  it.each([
    {},
    { E2E_AUTH_RATE_LIMIT_DISABLED: 'true' },
    {
      E2E_AUTH_RATE_LIMIT_DISABLED: '1',
      DATABASE_URL: disposableDatabaseUrl,
    },
    {
      E2E_AUTH_RATE_LIMIT_DISABLED: '1',
      DATABASE_URL: disposableDatabaseUrl,
      E2E_DATABASE_URL:
        'postgresql://postgres:postgres@127.0.0.1:5432/other_e2e',
    },
    {
      E2E_AUTH_RATE_LIMIT_DISABLED: '1',
      DATABASE_URL:
        'postgresql://postgres:postgres@database.example.com:5432/mini_workout_e2e',
      E2E_DATABASE_URL:
        'postgresql://postgres:postgres@database.example.com:5432/mini_workout_e2e',
    },
  ])('rejects an unsafe E2E bypass environment: %#', (env) => {
    expect(
      getAuthRateLimitOptions({ NODE_ENV: 'production', ...env }),
    ).toMatchObject({ enabled: true, storage: 'database' });
  });

  it('returns safe retry metadata after the configured sign-in budget', async () => {
    const auth = betterAuth({
      baseURL: 'http://localhost:3000',
      secret: 'rate-limit-test-secret-longer-than-thirty-two-characters',
      database: memoryAdapter({
        user: [],
        session: [],
        account: [],
        verification: [],
      }),
      emailAndPassword: { enabled: true },
      rateLimit: {
        ...getAuthRateLimitOptions({ NODE_ENV: 'production' }),
        storage: 'memory',
      },
    });

    const request = () =>
      auth.handler(
        new Request('http://localhost:3000/api/auth/sign-in/email', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'http://localhost:3000',
          },
          body: JSON.stringify({
            email: 'unknown@example.test',
            password: 'incorrect-password',
          }),
        }),
      );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await request()).status).not.toBe(429);
    }

    const limited = await request();
    expect(limited.status).toBe(429);
    expect(limited.headers.get('x-retry-after')).toMatch(/^\d+$/);
    await expect(limited.json()).resolves.toEqual({
      message: 'Too many requests. Please try again later.',
    });
  });

  it('protects Server Actions with pseudonymous IP and account buckets', async () => {
    const consume = vi
      .fn()
      .mockResolvedValueOnce({ allowed: true, retryAfter: null })
      .mockResolvedValueOnce({ allowed: true, retryAfter: null });
    const limiter = createAuthActionRateLimiter({
      enabled: true,
      identitySecret: 'action-rate-limit-secret',
      store: { consume },
    });

    await limiter.check({
      path: '/sign-in/email',
      identifier: 'Private.User@Example.test',
      headers: new Headers({ 'x-forwarded-for': '203.0.113.4, 10.0.0.1' }),
    });

    expect(consume).toHaveBeenCalledTimes(2);
    expect(consume).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/^auth-action:\/sign-in\/email:ip:[a-f0-9]{64}$/),
      AUTH_RATE_LIMIT_RULES['/sign-in/email'],
    );
    expect(consume).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(
        /^auth-action:\/sign-in\/email:identity:[a-f0-9]{64}$/,
      ),
      AUTH_RATE_LIMIT_RULES['/sign-in/email'],
    );
    expect(JSON.stringify(consume.mock.calls)).not.toContain(
      'private.user@example.test',
    );
    expect(JSON.stringify(consume.mock.calls)).not.toContain('203.0.113.4');
  });

  it('throws an expected, non-reportable error when an action budget is exhausted', async () => {
    const limiter = createAuthActionRateLimiter({
      enabled: true,
      identitySecret: 'action-rate-limit-secret',
      store: {
        consume: vi.fn().mockResolvedValue({
          allowed: false,
          retryAfter: 42,
        }),
      },
    });

    await expect(
      limiter.check({
        path: '/request-password-reset',
        identifier: 'user@example.test',
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_RATE_LIMITED',
      category: 'rate_limited',
      retryAfter: 42,
      reportable: false,
    });
  });

  it('fails closed and classifies a storage outage as reportable dependency failure', async () => {
    const limiter = createAuthActionRateLimiter({
      enabled: true,
      identitySecret: 'action-rate-limit-secret',
      store: { consume: vi.fn().mockRejectedValue(new Error('private db')) },
    });

    await expect(
      limiter.check({
        path: '/sign-up/email',
        identifier: 'user@example.test',
        headers: new Headers(),
      }),
    ).rejects.toBeInstanceOf(AuthRateLimitUnavailableError);
  });

  it('does not touch storage when action limiting is disabled', async () => {
    const consume = vi.fn();
    const limiter = createAuthActionRateLimiter({
      enabled: false,
      identitySecret: '',
      store: { consume },
    });

    await limiter.check({ path: '/sign-in/email', headers: new Headers() });
    expect(consume).not.toHaveBeenCalled();
  });

  it('exports stable error classes for application-boundary mapping', () => {
    expect(new AuthRateLimitedError(30)).toMatchObject({
      status: 429,
      retryable: true,
      reportable: false,
    });
    expect(new AuthRateLimitUnavailableError()).toMatchObject({
      status: 503,
      retryable: true,
      reportable: true,
    });
  });
});
