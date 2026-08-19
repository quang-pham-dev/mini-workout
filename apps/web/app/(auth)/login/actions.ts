'use server';

import { signIn } from '../../../auth';
import { getSafeRedirectPath } from '../../../lib/auth/authorization';
import { loginSchema } from '../../../lib/auth/validation';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  const callbackUrl = getSafeRedirectPath(
    formData.get('callbackUrl')?.toString(),
  );

  if (!parsed.success) {
    redirect('/login?error=invalid');
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/login?error=invalid');
    }
    throw error;
  }
}
