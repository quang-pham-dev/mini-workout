'use server';

import { auth } from '@/auth';
import {
  ONBOARDING_COOKIE_NAME,
  ONBOARDING_COOKIE_VALUES,
} from '@/lib/auth/constants';
import { getAuthErrorCode } from '@/lib/auth/errors';
import { registerSchema } from '@/lib/auth/validation';
import { withServerActionErrorBoundary } from '@/lib/observability/action-error';
import { AuthRateLimitedError } from '@mini-workout/auth/rate-limit';
import { authActionRateLimiter } from '@mini-workout/auth/rate-limit-prisma';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type RegisterFormState = {
  error: string | null;
  name?: string;
  email?: string;
};

export async function registerAction(
  prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  return withServerActionErrorBoundary('auth.register', () =>
    registerActionImpl(prevState, formData),
  );
}

async function registerActionImpl(
  prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    redirect('/register?error=invalid');
  }

  const requestHeaders = await headers();
  try {
    await authActionRateLimiter.check({
      path: '/sign-up/email',
      identifier: parsed.data.email,
      headers: requestHeaders,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitedError) {
      redirect('/register?error=rate-limited');
    }
    throw error;
  }

  let requiresEmailVerification = false;
  try {
    const registration = await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: '/verify-email',
      },
      headers: requestHeaders,
    });
    requiresEmailVerification = registration.token === null;
  } catch (error) {
    const code = getAuthErrorCode(error);
    if (
      code === 'USER_ALREADY_EXISTS' ||
      code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
    ) {
      redirect('/register?error=unavailable');
    }
    throw error;
  }

  if (requiresEmailVerification) redirect('/verify-email');

  const cookieStore = await cookies();
  cookieStore.set(
    ONBOARDING_COOKIE_NAME,
    ONBOARDING_COOKIE_VALUES.IN_PROGRESS,
    {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  );

  // New users always need onboarding first
  redirect('/onboarding');
}
