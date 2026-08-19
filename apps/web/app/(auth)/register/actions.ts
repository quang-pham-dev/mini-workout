'use server';

import { auth } from '../../../auth';
import { getSafeRedirectPath } from '../../../lib/auth/authorization';
import { registerSchema } from '../../../lib/auth/validation';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function registerAction(formData: FormData) {
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

  redirect(getSafeRedirectPath(formData.get('callbackUrl')?.toString()));
}
