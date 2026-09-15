import { getAdminCoaches, getAdminWorkouts } from './server-functions';
import { queryOptions } from '@tanstack/react-query';

export function adminWorkoutsQueryOptions(cursor?: string) {
  return queryOptions({
    queryKey: ['admin', 'workouts', { cursor }] as const,
    queryFn: () => getAdminWorkouts({ data: { cursor } }),
    staleTime: 30_000,
  });
}

export function adminCoachesQueryOptions(cursor?: string) {
  return queryOptions({
    queryKey: ['admin', 'coaches', { cursor }] as const,
    queryFn: () => getAdminCoaches({ data: { cursor } }),
    staleTime: 30_000,
  });
}
