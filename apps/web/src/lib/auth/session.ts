import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { headers } from 'next/headers';
import { cache } from 'react';

/**
 * Get current session from auth.
 * Cache the session to avoid multiple requests.
 * @returns Promise<{ user: { id: string } }>
 *
 */
export const getCurrentSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Get user profile from database.
 * Cache the profile to avoid multiple requests.
 * @param userId - The ID of the user to get the profile for.
 * @returns Promise<{ onboardingCompleted: boolean; interests: { interestId: string }[] }>
 *
 */
export const getUserProfile = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingCompleted: true,
      interests: { select: { interestId: true } },
    },
  });
});
