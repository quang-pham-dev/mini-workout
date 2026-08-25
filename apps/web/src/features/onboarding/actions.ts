'use server';

import { auth } from '@/auth';
import { onboardingSchema } from '@/features/onboarding/schema';
import { prisma } from '@/lib/db/prisma';
import { ExperienceLevel } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function completeOnboarding(formData: FormData) {
  const parsed = onboardingSchema.safeParse({
    experienceLevel: formData.get('experienceLevel'),
    interests: formData.getAll('interests'),
  });

  if (!parsed.success) {
    redirect('/onboarding?error=invalid');
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user.id) {
    redirect('/login?callbackUrl=%2Fonboarding');
  }

  const interestIds = [...new Set(parsed.data.interests)];
  const validInterests = await prisma.interest.findMany({
    where: { id: { in: interestIds } },
    select: { id: true },
  });

  if (validInterests.length !== interestIds.length) {
    redirect('/onboarding?error=invalid');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        experienceLevel: parsed.data.experienceLevel as ExperienceLevel,
        onboardingCompleted: true,
      },
    }),
    prisma.userInterest.deleteMany({ where: { userId: session.user.id } }),
    prisma.userInterest.createMany({
      data: interestIds.map((interestId) => ({
        userId: session.user.id,
        interestId,
      })),
    }),
  ]);

  revalidatePath('/home');
  redirect('/home');
}
