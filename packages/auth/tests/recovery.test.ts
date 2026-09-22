import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { describe, expect, it, vi } from 'vitest';

const credentials = {
  name: 'Recovery User',
  email: 'recovery-user@example.test',
  password: 'original-password',
};

describe('password recovery policy', () => {
  it('keeps account discovery generic and sends only for an existing user', async () => {
    const sendResetPassword = vi.fn();
    const auth = createRecoveryAuth(sendResetPassword);
    await auth.api.signUpEmail({ body: credentials });

    const known = await auth.api.requestPasswordReset({
      body: { email: credentials.email, redirectTo: '/reset-password' },
    });
    const unknown = await auth.api.requestPasswordReset({
      body: {
        email: 'unknown-user@example.test',
        redirectTo: '/reset-password',
      },
    });

    expect(known).toEqual(unknown);
    expect(sendResetPassword).toHaveBeenCalledOnce();
  });

  it('consumes the token once, changes the password, and revokes existing sessions', async () => {
    let resetUrl = '';
    const sendResetPassword = vi.fn(async ({ url }: { url: string }) => {
      resetUrl = url;
    });
    const data = {
      user: [],
      session: [],
      account: [],
      verification: [],
    };
    const auth = createRecoveryAuth(sendResetPassword, data);
    await auth.api.signUpEmail({ body: credentials });
    expect(data.session).toHaveLength(1);

    await auth.api.requestPasswordReset({
      body: { email: credentials.email, redirectTo: '/reset-password' },
    });
    const token = new URL(resetUrl).pathname.split('/').at(-1);
    expect(token).toEqual(expect.any(String));

    await expect(
      auth.api.resetPassword({
        body: { token, newPassword: 'replacement-password' },
      }),
    ).resolves.toEqual({ status: true });
    expect(data.session).toHaveLength(0);

    await expect(
      auth.api.resetPassword({
        body: { token, newPassword: 'another-password' },
      }),
    ).rejects.toMatchObject({ body: { code: 'INVALID_TOKEN' } });
    await expect(
      auth.api.signInEmail({
        body: { email: credentials.email, password: credentials.password },
      }),
    ).rejects.toMatchObject({ body: { code: 'INVALID_EMAIL_OR_PASSWORD' } });
    await expect(
      auth.api.signInEmail({
        body: {
          email: credentials.email,
          password: 'replacement-password',
        },
      }),
    ).resolves.toMatchObject({ token: expect.any(String) });
  });
});

function createRecoveryAuth(
  sendResetPassword: ReturnType<typeof vi.fn>,
  data: {
    user: unknown[];
    session: unknown[];
    account: unknown[];
    verification: unknown[];
  } = { user: [], session: [], account: [], verification: [] },
) {
  return betterAuth({
    baseURL: 'http://localhost:3000',
    secret: 'recovery-test-secret-longer-than-thirty-two-characters',
    database: memoryAdapter(data),
    emailAndPassword: {
      enabled: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword,
    },
  });
}
