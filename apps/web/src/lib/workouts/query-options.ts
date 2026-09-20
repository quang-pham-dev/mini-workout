import { fetchWorkoutEngagement } from './api';
import { workoutKeys } from './cache';
import { queryOptions } from '@tanstack/react-query';

const ENGAGEMENT_STALE_TIME = 5 * 60_000;
const ENGAGEMENT_GC_TIME = 30 * 60_000;

export function workoutEngagementQueryOptions(
  viewerId: string,
  workoutId: string,
) {
  return queryOptions({
    queryKey: workoutKeys.engagement(viewerId, workoutId),
    queryFn: ({ signal }) => fetchWorkoutEngagement(workoutId, signal),
    staleTime: ENGAGEMENT_STALE_TIME,
    gcTime: ENGAGEMENT_GC_TIME,
  });
}
