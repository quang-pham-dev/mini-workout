/**
 * Feature-owned cache tags. Keep tag construction in one place so reads and
 * invalidations cannot silently drift apart.
 */
export const CACHE_TAGS = {
  categories: 'workout-categories',
  workouts: 'workouts',
  workout: (slug: string) => `workout:${slug}`,
  onboarding: (userId: string) => `onboarding:${userId}`,
} as const;
