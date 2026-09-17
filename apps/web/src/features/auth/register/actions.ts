'use server';

import { auth } from '@/auth';
import {
  ONBOARDING_COOKIE_NAME,
  ONBOARDING_COOKIE_VALUES,
} from '@/lib/auth/constants';
import { registerSchema } from '@/lib/auth/validation';
import { withServerActionErrorBoundary } from '@/lib/observability/action-error';
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

  try {
    await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
  } catch {
    redirect('/register?error=unavailable');
  }

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
