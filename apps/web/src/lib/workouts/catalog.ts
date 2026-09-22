import { CACHE_TAGS } from '@/lib/cache/tags';
import { getPublishedCategories } from '@mini-workout/core/workouts';
import { cacheLife, cacheTag } from 'next/cache';
import 'server-only';

export async function getCachedWorkoutCategories() {
  'use cache';
  cacheLife('hours');
  cacheTag(CACHE_TAGS.categories);
  return getPublishedCategories();
}
