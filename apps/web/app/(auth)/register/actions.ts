'use server';

import { signIn } from '../../../auth';
import { getSafeRedirectPath } from '../../../lib/auth/authorization';
import { registerSchema } from '../../../lib/auth/validation';
import { prisma } from '../../../lib/db/prisma';
import { hash } from 'bcryptjs';
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

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingUser) {
    redirect('/register?error=unavailable');
  }

  const passwordHash = await hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  await signIn('credentials', {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: getSafeRedirectPath(formData.get('callbackUrl')?.toString()),
  });
}
