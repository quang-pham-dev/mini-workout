import { auth } from '@/auth';
import {
  getRedirectStepParam,
  isReadyForApp,
} from '@/features/onboarding/state-machine';
import { getOnboardingProfile } from '@mini-workout/core/users';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';

/**
 * Get current session from auth.
 * Cache the session to avoid multiple requests.
 * @returns Promise<{ user: { id: string } }>
 *
 */
export const getCurrentSession = cache(async () => {
  await connection();
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Get user profile from database.
 * Cache the profile to avoid multiple requests.
 * @param userId - The ID of the user to get the profile for.
 * @returns Promise<{ onboardingStatus: string; interests: { interestId: string }[] }>
 *
 */
export const getUserProfile = cache(async (userId: string) => {
  return getOnboardingProfile({ userId });
});

/**
 * Get current session, redirecting to /login if not authenticated.
 * Use in components under (app) layout where auth is guaranteed.
 * This is a defense-in-depth fallback — the layout guard handles the primary check.
 * @returns Promise<{ user: { id: string; name?: string | null; email: string } }>
 */
export async function requireSession() {
  const session = await getCurrentSession();

  if (!session?.user.id) {
    redirect('/login');
  }

  return session;
}

/**
 * Get current session and profile, redirecting to /login if unauthenticated,
 * or /onboarding if the user has not completed onboarding.
 * Use inside Suspense boundaries in (app) pages.
 */
export async function requireOnboardedUser() {
  const session = await requireSession();
  const profile = await getUserProfile(session.user.id);

  if (!profile) {
    redirect('/login');
  }

  if (!isReadyForApp(profile.onboardingStatus)) {
    redirect(`/onboarding?step=${getRedirectStepParam(profile.currentStep)}`);
  }

  return { session, profile };
}
