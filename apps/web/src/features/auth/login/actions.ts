'use server';

import { auth } from '@/auth';
import {
  getOnboardingCookieValue,
  isReadyForApp,
} from '@/features/onboarding/state-machine';
import { getSafeRedirectPath } from '@/lib/auth/authorization';
import { ONBOARDING_COOKIE_NAME } from '@/lib/auth/constants';
import { getUserProfile } from '@/lib/auth/session';
import { loginSchema } from '@/lib/auth/validation';
import { withServerActionErrorBoundary } from '@/lib/observability/action-error';
import type { Route } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type LoginFormState = {
  error: string | null;
  email?: string;
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

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: true,
      },
      headers: await headers(),
    });
  } catch {
    return {
      error: 'Invalid email or password.',
      email: rawEmail,
    };
  }

  const session = await auth.api.getSession({ headers: await headers() });
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
