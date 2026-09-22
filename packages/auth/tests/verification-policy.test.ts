import {
  createEmailVerificationRequestHook,
  isEmailVerificationRequired,
} from '../src/verification-policy';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { describe, expect, it, vi } from 'vitest';

describe('email verification policy', () => {
  it('evaluates the stable flag with a request-scoped identity', async () => {
    const reader = { isEnabled: vi.fn().mockResolvedValue(true) };

    await expect(
      isEmailVerificationRequired(reader, {
        distinctId: 'user-123',
        properties: { environment: 'staging' },
      }),
    ).resolves.toBe(true);

    expect(reader.isEnabled).toHaveBeenCalledWith('auth.emailVerification', {
      distinctId: 'user-123',
      properties: { environment: 'staging' },
    });
  });

  it('preserves the reader fallback when the provider is unavailable', async () => {
    const reader = { isEnabled: vi.fn().mockResolvedValue(false) };

    await expect(
      isEmailVerificationRequired(reader, { distinctId: 'request-123' }),
    ).resolves.toBe(false);
  });

  it('keeps the existing auto-sign-in flow when verification is disabled', async () => {
    const sendVerificationEmail = vi.fn();
    const reader = { isEnabled: vi.fn().mockResolvedValue(false) };
    const auth = createTestAuth({ reader, sendVerificationEmail });

    const registration = await auth.api.signUpEmail({
      body: TEST_CREDENTIALS,
    });

    expect(registration.token).toEqual(expect.any(String));
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('requires verification per request without mutating the auth singleton', async () => {
    const sendVerificationEmail = vi.fn();
    const reader = { isEnabled: vi.fn().mockResolvedValue(true) };
    const auth = createTestAuth({ reader, sendVerificationEmail });

    const registration = await auth.api.signUpEmail({
      body: TEST_CREDENTIALS,
    });

    expect(reader.isEnabled).toHaveBeenCalled();
    expect(registration.token).toBeNull();
    expect(sendVerificationEmail).toHaveBeenCalledOnce();

    await expect(
      auth.api.signInEmail({
        body: {
          email: TEST_CREDENTIALS.email,
          password: TEST_CREDENTIALS.password,
        },
      }),
    ).rejects.toMatchObject({
      body: { code: 'EMAIL_NOT_VERIFIED' },
    });

    const distinctIds = reader.isEnabled.mock.calls.map(
      ([, context]) => context.distinctId,
    );
    expect(distinctIds).toHaveLength(2);
    expect(distinctIds[0]).toBe(distinctIds[1]);
    expect(distinctIds[0]).not.toContain(TEST_CREDENTIALS.email);
  });

  it('keeps verification resend disabled when the rollout flag is off', async () => {
    const sendVerificationEmail = vi.fn();
    const reader = { isEnabled: vi.fn().mockResolvedValue(false) };
    const auth = createTestAuth({ reader, sendVerificationEmail });
    await auth.api.signUpEmail({ body: TEST_CREDENTIALS });

    await expect(
      auth.api.sendVerificationEmail({
        body: { email: TEST_CREDENTIALS.email },
      }),
    ).resolves.toEqual({ status: true });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});

const TEST_CREDENTIALS = {
  name: 'Test User',
  email: 'test-user@example.test',
  password: 'correct-horse-battery-staple',
};

function createTestAuth({
  reader,
  sendVerificationEmail,
}: {
  reader: { isEnabled: ReturnType<typeof vi.fn> };
  sendVerificationEmail: ReturnType<typeof vi.fn>;
}) {
  return betterAuth({
    appName: 'Mini Workout Test',
    baseURL: 'http://localhost:3000',
    secret: 'test-secret-that-is-longer-than-thirty-two-characters',
    database: memoryAdapter({
      user: [],
      session: [],
      account: [],
      verification: [],
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    emailVerification: {
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
      sendVerificationEmail,
    },
    hooks: {
      before: createEmailVerificationRequestHook({
        reader,
        identitySecret: 'test-rollout-secret',
      }),
    },
  });
}
