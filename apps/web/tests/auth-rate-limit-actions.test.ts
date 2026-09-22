import { loginAction } from '@/features/auth/login/actions';
import {
  requestPasswordResetAction,
  resendVerificationAction,
  resetPasswordAction,
} from '@/features/auth/recovery/actions';
import { registerAction } from '@/features/auth/register/actions';
import { AuthRateLimitedError } from '@mini-workout/auth/rate-limit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  getSession: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  sendVerificationEmail: vi.fn(),
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
      requestPasswordReset: mocks.requestPasswordReset,
      resetPassword: mocks.resetPassword,
      sendVerificationEmail: mocks.sendVerificationEmail,
      signInEmail: mocks.signInEmail,
      signUpEmail: mocks.signUpEmail,
    },
  },
}));

vi.mock('@mini-workout/auth/rate-limit-prisma', () => ({
  authActionRateLimiter: { check: mocks.check },
}));

vi.mock('@/lib/observability/action-error', () => ({
  withServerActionErrorBoundary: async (
    _operation: string,
    action: () => Promise<unknown>,
  ) => action(),
}));

vi.mock('@/lib/auth/session', () => ({ getUserProfile: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: vi.fn() })),
  headers: vi.fn(async () => new Headers({ 'x-forwarded-for': '203.0.113.5' })),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
}));

describe('auth Server Action rate limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.check.mockRejectedValue(new AuthRateLimitedError(60));
  });

  it('maps a limited sign-in to safe retry copy without calling Better Auth', async () => {
    const formData = new FormData();
    formData.set('email', 'Member@Example.test');
    formData.set('password', 'valid-password');
    formData.set('callbackUrl', '/home');

    await expect(loginAction({ error: null }, formData)).resolves.toEqual({
      error: 'Too many sign-in attempts. Please wait and try again.',
      email: 'Member@Example.test',
    });
    expect(mocks.signInEmail).not.toHaveBeenCalled();
  });

  it('maps only expected credential failures to invalid credentials', async () => {
    mocks.check.mockResolvedValue(undefined);
    mocks.signInEmail.mockRejectedValueOnce({
      body: { code: 'INVALID_EMAIL_OR_PASSWORD' },
    });
    const formData = new FormData();
    formData.set('email', 'member@example.test');
    formData.set('password', 'valid-password');

    await expect(loginAction({ error: null }, formData)).resolves.toEqual({
      error: 'Invalid email or password.',
      email: 'member@example.test',
    });

    mocks.signInEmail.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(loginAction({ error: null }, formData)).rejects.toThrow(
      'database unavailable',
    );
  });

  it('maps a limited registration to its dedicated safe UI state', async () => {
    const formData = new FormData();
    formData.set('name', 'Test Member');
    formData.set('email', 'member@example.test');
    formData.set('password', 'valid-password');
    formData.set('confirmPassword', 'valid-password');

    await expect(registerAction({ error: null }, formData)).rejects.toThrow(
      'REDIRECT:/register?error=rate-limited',
    );
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });

  it('reports unexpected registration failures instead of classifying every failure as input', async () => {
    mocks.check.mockResolvedValue(undefined);
    mocks.signUpEmail.mockRejectedValue(new Error('database unavailable'));
    const formData = new FormData();
    formData.set('name', 'Test Member');
    formData.set('email', 'member@example.test');
    formData.set('password', 'valid-password');
    formData.set('confirmPassword', 'valid-password');

    await expect(registerAction({ error: null }, formData)).rejects.toThrow(
      'database unavailable',
    );
  });

  it('keeps recovery and resend responses generic when limited', async () => {
    const formData = new FormData();
    formData.set('email', 'member@example.test');

    await expect(
      requestPasswordResetAction({ error: null }, formData),
    ).resolves.toEqual({ error: null, submitted: true });
    await expect(
      resendVerificationAction({ error: null }, formData),
    ).resolves.toEqual({ error: null, sent: true });
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('keeps recovery and resend responses generic when their dependencies fail', async () => {
    mocks.check.mockResolvedValue(undefined);
    mocks.requestPasswordReset.mockRejectedValue(
      new Error('provider unavailable'),
    );
    mocks.sendVerificationEmail.mockRejectedValue(
      new Error('provider unavailable'),
    );
    const formData = new FormData();
    formData.set('email', 'member@example.test');

    await expect(
      requestPasswordResetAction({ error: null }, formData),
    ).resolves.toEqual({ error: null, submitted: true });
    await expect(
      resendVerificationAction({ error: null }, formData),
    ).resolves.toEqual({ error: null, sent: true });
  });

  it('separates invalid reset tokens from unexpected dependency failures', async () => {
    mocks.check.mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set('token', 'one-time-token');
    formData.set('newPassword', 'new-valid-password');

    mocks.resetPassword.mockRejectedValueOnce({
      body: { code: 'INVALID_TOKEN' },
    });
    await expect(
      resetPasswordAction({ error: null }, formData),
    ).resolves.toEqual({
      error: 'This reset link is invalid or has expired.',
    });

    mocks.resetPassword.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    await expect(
      resetPasswordAction({ error: null }, formData),
    ).resolves.toEqual({
      error: "We couldn't update your password. Please try again.",
    });
  });
});
