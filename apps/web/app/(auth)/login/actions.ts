'use server';

import { auth } from '../../../auth';
import { getSafeRedirectPath } from '../../../lib/auth/authorization';
import { loginSchema } from '../../../lib/auth/validation';
import { headers } from 'next/headers';
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
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: true,
      },
      headers: await headers(),
    });
  } catch {
    redirect('/login?error=invalid');
  }

  redirect(callbackUrl);
}
