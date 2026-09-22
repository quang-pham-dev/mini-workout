'use server';

import { CACHE_TAGS } from './tags';
import { updateTag } from 'next/cache';

export async function revalidateWorkoutLibraryCache() {
  updateTag(CACHE_TAGS.workouts);
  updateTag(CACHE_TAGS.categories);
}

export async function revalidateWorkoutCache(slug: string) {
  updateTag(CACHE_TAGS.workouts);
  updateTag(CACHE_TAGS.workout(slug));
}

export async function revalidateOnboardingCache(userId: string) {
  updateTag(CACHE_TAGS.onboarding(userId));
}
