'use server';

import { auth } from '@/auth';
import { ONBOARDING_COOKIE_NAME } from '@/lib/auth/constants';
import { getAuthErrorCode } from '@/lib/auth/errors';
import { withServerActionErrorBoundary } from '@/lib/observability/action-error';
import {
  AuthRateLimitUnavailableError,
  AuthRateLimitedError,
} from '@mini-workout/auth/rate-limit';
import { authActionRateLimiter } from '@mini-workout/auth/rate-limit-prisma';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type RecoveryFormState = { error: string | null; submitted?: boolean };

async function runGenericRecoveryRequest(
  operation: string,
  request: () => Promise<void>,
): Promise<void> {
  try {
    await withServerActionErrorBoundary(operation, request);
  } catch {
    // The boundary already classified and reported unexpected failures. Keep
    // the public result identical so this flow cannot disclose an account.
  }
}

export async function requestPasswordResetAction(
  _prevState: RecoveryFormState,
  formData: FormData,
): Promise<RecoveryFormState> {
  const email = formData.get('email')?.toString().trim() ?? '';
  if (!email) return { error: 'Enter the email associated with your account.' };

  await runGenericRecoveryRequest('auth.request-password-reset', async () => {
    const requestHeaders = await headers();
    try {
      await authActionRateLimiter.check({
        path: '/request-password-reset',
        identifier: email,
        headers: requestHeaders,
      });
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: '/reset-password' },
        headers: requestHeaders,
      });
    } catch (error) {
      if (!(error instanceof AuthRateLimitedError)) throw error;
      // Keep this response generic so account existence is never disclosed.
    }
  });

  return { error: null, submitted: true };
}

export type ResetPasswordFormState = {
  error: string | null;
  completed?: boolean;
};

export async function resetPasswordAction(
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const token = formData.get('token')?.toString() ?? '';
  const newPassword = formData.get('newPassword')?.toString() ?? '';
  if (!token || newPassword.length < 8) {
    return {
      error: 'Use a valid reset link and a password with 8 characters.',
    };
  }

  let result: ResetPasswordFormState;
  try {
    result = await withServerActionErrorBoundary(
      'auth.reset-password',
      async () => {
        const requestHeaders = await headers();
        try {
          await authActionRateLimiter.check({
            path: '/reset-password',
            headers: requestHeaders,
          });
          await auth.api.resetPassword({
            body: { newPassword, token },
            headers: requestHeaders,
          });
        } catch (error) {
          if (error instanceof AuthRateLimitedError) {
            return { error: 'Too many attempts. Please wait and try again.' };
          }
          if (error instanceof AuthRateLimitUnavailableError) throw error;

          const code = getAuthErrorCode(error);
          if (code === 'INVALID_TOKEN' || code === 'USER_NOT_FOUND') {
            return { error: 'This reset link is invalid or has expired.' };
          }
          throw error;
        }

        return { error: null, completed: true };
      },
    );
  } catch {
    return { error: "We couldn't update your password. Please try again." };
  }

  if (result.completed) {
    // Password reset revokes all auth sessions. The onboarding cookie is a
    // derived session hint and must not survive that boundary, otherwise the
    // edge guard can redirect a signed-out user through stale onboarding
    // state before the login callback is evaluated.
    const cookieStore = await cookies();
    cookieStore.delete(ONBOARDING_COOKIE_NAME);
    redirect('/login?reset=1');
  }
  return result;
}

export type VerificationFormState = { error: string | null; sent?: boolean };

export async function resendVerificationAction(
  _prevState: VerificationFormState,
  formData: FormData,
): Promise<VerificationFormState> {
  const email = formData.get('email')?.toString().trim() ?? '';
  if (!email) return { error: 'Enter your account email.' };

  await runGenericRecoveryRequest('auth.resend-verification', async () => {
    const requestHeaders = await headers();
    try {
      await authActionRateLimiter.check({
        path: '/send-verification-email',
        identifier: email,
        headers: requestHeaders,
      });
      await auth.api.sendVerificationEmail({
        body: { email, callbackURL: '/verify-email' },
        headers: requestHeaders,
      });
    } catch (error) {
      if (!(error instanceof AuthRateLimitedError)) throw error;
      // Always return a generic success response to avoid account enumeration.
    }
  });

  return { error: null, sent: true };
}
