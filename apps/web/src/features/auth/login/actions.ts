'use server';

import { auth } from '@/auth';
import { getSafeRedirectPath } from '@/lib/auth/authorization';
import { ONBOARDING_COOKIE_NAME } from '@/lib/auth/constants';
import { getAuthErrorCode } from '@/lib/auth/errors';
import { getUserProfile } from '@/lib/auth/session';
import { loginSchema } from '@/lib/auth/validation';
import { withServerActionErrorBoundary } from '@/lib/observability/action-error';
import {
  getOnboardingCookieValue,
  isReadyForApp,
} from '@/lib/onboarding/state-machine';
import { AuthRateLimitedError } from '@mini-workout/auth/rate-limit';
import { authActionRateLimiter } from '@mini-workout/auth/rate-limit-prisma';
import type { Route } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type LoginFormState = {
  error: string | null;
  email?: string;
  needsVerification?: boolean;
};

export async function loginAction(
  prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  return withServerActionErrorBoundary('auth.login', () =>
    loginActionImpl(prevState, formData),
  );
}

async function loginActionImpl(
  prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const rawEmail = formData.get('email')?.toString() ?? '';

  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      error: 'Please enter a valid email and password.',
      email: rawEmail,
    };
  }

  const callbackUrl = getSafeRedirectPath(
    formData.get('callbackUrl')?.toString(),
  );
  const requestHeaders = await headers();

  try {
    await authActionRateLimiter.check({
      path: '/sign-in/email',
      identifier: parsed.data.email,
      headers: requestHeaders,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitedError) {
      return {
        error: 'Too many sign-in attempts. Please wait and try again.',
        email: rawEmail,
      };
    }
    throw error;
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: true,
      },
      headers: requestHeaders,
    });
  } catch (error) {
    const code = getAuthErrorCode(error);
    if (code === 'EMAIL_NOT_VERIFIED') {
      return {
        error: 'Please verify your email before signing in.',
        email: rawEmail,
        needsVerification: true,
      };
    }

    if (code === 'INVALID_EMAIL_OR_PASSWORD') {
      return {
        error: 'Invalid email or password.',
        email: rawEmail,
      };
    }

    throw error;
  }

  const session = await auth.api.getSession({ headers: requestHeaders });
  let destination = callbackUrl;

  if (session?.user?.id) {
    const profile = await getUserProfile(session.user.id);
    const isOnboarded = isReadyForApp(profile?.onboardingStatus);

    const cookieStore = await cookies();
    cookieStore.set(
      ONBOARDING_COOKIE_NAME,
      getOnboardingCookieValue(profile?.onboardingStatus),
      {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    );

    if (!isOnboarded) {
      destination = `/onboarding?step=${profile?.currentStep ?? 'EXPERIENCE_LEVEL'}`;
    } else if (callbackUrl === '/onboarding') {
      destination = '/home';
    }
  }

  // redirect() throws internal -> not fall into catch because outside try/catch
  redirect(destination as Route);
}
