'use server';

import { auth } from '@/auth';
import {
  experienceStepSchema,
  interestsStepSchema,
  onboardingSchema,
  scheduleStepSchema,
} from '@/features/onboarding/schema';
import {
  type OnboardingStatus,
  getOnboardingCookieValue,
} from '@/features/onboarding/state-machine';
import { ONBOARDING_COOKIE_NAME } from '@/lib/auth/constants';
import { withServerActionErrorBoundary } from '@/lib/observability/action-error';
import { NotFoundError, ValidationError } from '@mini-workout/core/errors';
import {
  completeRequiredOnboarding,
  finishOptionalOnboarding,
  saveExperience,
} from '@mini-workout/core/onboarding';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

async function requireOnboardingUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) redirect('/login?callbackUrl=%2Fonboarding');
  return session.user.id;
}

async function setOnboardingCookie(status: OnboardingStatus) {
  const cookieStore = await cookies();
  cookieStore.set(ONBOARDING_COOKIE_NAME, getOnboardingCookieValue(status), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function completeOnboarding(formData: FormData) {
  return withServerActionErrorBoundary('onboarding.complete', () =>
    completeOnboardingImpl(formData),
  );
}

async function completeOnboardingImpl(formData: FormData) {
  const parsed = onboardingSchema.safeParse({
    experienceLevel: formData.get('experienceLevel'),
    interests: formData.getAll('interests'),
  });
  if (!parsed.success) redirect('/onboarding?error=invalid');

  const userId = await requireOnboardingUser();
  try {
    await completeRequiredOnboarding({
      userId,
      experienceLevel: parsed.data.experienceLevel,
      interestIds: parsed.data.interests,
    });
  } catch (error) {
    if (error instanceof ValidationError) redirect('/onboarding?error=invalid');
    throw error;
  }

  await setOnboardingCookie('REQUIRED_COMPLETED');
  revalidatePath('/home');
  redirect(formData.get('mode') === 'edit' ? '/profile' : '/home');
}

export async function saveExperienceStep(formData: FormData) {
  return withServerActionErrorBoundary('onboarding.experience.save', () =>
    saveExperienceStepImpl(formData),
  );
}

async function saveExperienceStepImpl(formData: FormData) {
  const parsed = experienceStepSchema.safeParse({
    experienceLevel: formData.get('experienceLevel'),
  });
  if (!parsed.success) {
    redirect('/onboarding?step=EXPERIENCE_LEVEL&error=invalid');
  }

  const userId = await requireOnboardingUser();
  await saveExperience({
    userId,
    experienceLevel: parsed.data.experienceLevel,
  });
  await setOnboardingCookie('IN_PROGRESS');
  redirect('/onboarding?step=INTERESTS');
}

export async function saveInterestsStep(formData: FormData) {
  return withServerActionErrorBoundary('onboarding.interests.save', () =>
    saveInterestsStepImpl(formData),
  );
}

async function saveInterestsStepImpl(formData: FormData) {
  const parsed = interestsStepSchema.safeParse({
    interests: formData.getAll('interests'),
  });
  if (!parsed.success) redirect('/onboarding?step=INTERESTS&error=invalid');

  const userId = await requireOnboardingUser();
  try {
    await completeRequiredOnboarding({
      userId,
      interestIds: parsed.data.interests,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      redirect('/onboarding?step=INTERESTS&error=invalid');
    }
    throw error;
  }

  await setOnboardingCookie('REQUIRED_COMPLETED');
  revalidatePath('/home');
  redirect(formData.get('mode') === 'edit' ? '/profile' : '/home');
}

export async function saveWeeklyScheduleStep(formData: FormData) {
  return withServerActionErrorBoundary('onboarding.schedule.save', () =>
    saveWeeklyScheduleStepImpl(formData),
  );
}

async function saveWeeklyScheduleStepImpl(formData: FormData) {
  const parsed = scheduleStepSchema.safeParse({
    weeklyGoalDays: formData.get('weeklyGoalDays'),
  });
  if (!parsed.success) {
    redirect('/onboarding?step=WEEKLY_SCHEDULE&error=invalid');
  }
  await finishOptionalStep({
    weeklyGoalDays: parsed.data.weeklyGoalDays,
    skipped: false,
  });
}

export async function skipOptionalStep(formData: FormData) {
  return withServerActionErrorBoundary('onboarding.schedule.skip', () =>
    skipOptionalStepImpl(formData),
  );
}

async function skipOptionalStepImpl(formData: FormData) {
  if (formData.get('step')?.toString() !== 'WEEKLY_SCHEDULE') {
    redirect('/onboarding?step=WEEKLY_SCHEDULE&error=invalid');
  }
  await finishOptionalStep({ skipped: true });
}

async function finishOptionalStep({
  weeklyGoalDays,
  skipped,
}: {
  weeklyGoalDays?: number;
  skipped: boolean;
}) {
  const userId = await requireOnboardingUser();
  try {
    await finishOptionalOnboarding({
      userId,
      step: 'WEEKLY_SCHEDULE',
      weeklyGoalDays,
      skipped,
    });
  } catch (error) {
    if (error instanceof NotFoundError) redirect('/login');
    throw error;
  }

  await setOnboardingCookie('COMPLETED');
  revalidatePath('/home');
  revalidatePath('/profile');
  redirect('/home');
}
