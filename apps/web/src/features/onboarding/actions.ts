'use server';

import { auth } from '@/auth';
import {
  experienceStepSchema,
  interestsStepSchema,
  onboardingSchema,
  scheduleStepSchema,
} from '@/features/onboarding/schema';
import {
  type OnboardingStep,
  appendUniqueStep,
  getOnboardingCookieValue,
} from '@/features/onboarding/state-machine';
import { ONBOARDING_COOKIE_NAME } from '@/lib/auth/constants';
import { prisma } from '@/lib/db/prisma';
import { ExperienceLevel } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
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
        onboardingStatus: 'REQUIRED_COMPLETED',
        currentStep: 'WEEKLY_SCHEDULE',
        completedSteps: ['EXPERIENCE_LEVEL', 'INTERESTS'],
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

  const cookieStore = await cookies();
  cookieStore.set(
    ONBOARDING_COOKIE_NAME,
    getOnboardingCookieValue('REQUIRED_COMPLETED'),
    {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  );

  revalidatePath('/home');
  redirect(formData.get('mode') === 'edit' ? '/profile' : '/home');
}

export async function saveExperienceStep(formData: FormData) {
  const parsed = experienceStepSchema.safeParse({
    experienceLevel: formData.get('experienceLevel'),
  });

  if (!parsed.success) {
    redirect('/onboarding?step=EXPERIENCE_LEVEL&error=invalid');
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user.id) {
    redirect('/login?callbackUrl=%2Fonboarding');
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      experienceLevel: parsed.data.experienceLevel as ExperienceLevel,
      onboardingStatus: 'IN_PROGRESS',
      currentStep: 'INTERESTS',
      completedSteps: { push: 'EXPERIENCE_LEVEL' },
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    ONBOARDING_COOKIE_NAME,
    getOnboardingCookieValue('IN_PROGRESS'),
    {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  );

  redirect('/onboarding?step=INTERESTS');
}

export async function saveInterestsStep(formData: FormData) {
  const parsed = interestsStepSchema.safeParse({
    interests: formData.getAll('interests'),
  });

  if (!parsed.success) {
    redirect('/onboarding?step=INTERESTS&error=invalid');
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
    redirect('/onboarding?step=INTERESTS&error=invalid');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingStatus: 'REQUIRED_COMPLETED',
        currentStep: 'WEEKLY_SCHEDULE',
        completedSteps: ['EXPERIENCE_LEVEL', 'INTERESTS'],
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

  const cookieStore = await cookies();
  cookieStore.set(
    ONBOARDING_COOKIE_NAME,
    getOnboardingCookieValue('REQUIRED_COMPLETED'),
    {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  );

  revalidatePath('/home');
  redirect(formData.get('mode') === 'edit' ? '/profile' : '/home');
}

export async function saveWeeklyScheduleStep(formData: FormData) {
  const parsed = scheduleStepSchema.safeParse({
    weeklyGoalDays: formData.get('weeklyGoalDays'),
  });

  if (!parsed.success) {
    redirect('/onboarding?step=WEEKLY_SCHEDULE&error=invalid');
  }

  await finishOptionalStep({
    step: 'WEEKLY_SCHEDULE',
    data: { weeklyGoalDays: parsed.data.weeklyGoalDays },
    skipped: false,
  });
}

export async function skipOptionalStep(formData: FormData) {
  const rawStep = formData.get('step')?.toString();
  const step = rawStep === 'WEEKLY_SCHEDULE' ? rawStep : null;

  if (!step) {
    redirect('/onboarding?step=WEEKLY_SCHEDULE&error=invalid');
  }

  await finishOptionalStep({ step, data: {}, skipped: true });
}

async function finishOptionalStep({
  step,
  data,
  skipped,
}: {
  step: OnboardingStep;
  data: { weeklyGoalDays?: number };
  skipped: boolean;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user.id) {
    redirect('/login?callbackUrl=%2Fonboarding');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { completedSteps: true, skippedSteps: true },
  });

  if (!user) {
    redirect('/login');
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...data,
      onboardingStatus: 'COMPLETED',
      currentStep: 'DONE',
      completedSteps: skipped
        ? user.completedSteps
        : appendUniqueStep(user.completedSteps, step),
      skippedSteps: skipped
        ? appendUniqueStep(user.skippedSteps, step)
        : user.skippedSteps,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    ONBOARDING_COOKIE_NAME,
    getOnboardingCookieValue('COMPLETED'),
    {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  );

  revalidatePath('/home');
  revalidatePath('/profile');
  redirect('/home');
}
