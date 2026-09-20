import { makeQueryClient } from '@/lib/query/query-client';
import { workoutKeys } from '@/lib/workouts/cache';
import { toWorkoutEngagement } from '@/lib/workouts/engagement-state';
import type { WorkoutCard } from '@mini-workout/core/workouts';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

type EngagementWorkout = Pick<
  WorkoutCard,
  'id' | '_count' | 'likes' | 'favorites'
>;

export function WorkoutEngagementHydration({
  viewerId,
  workouts,
  children,
}: {
  viewerId: string;
  workouts: EngagementWorkout[];
  children: React.ReactNode;
}) {
  const queryClient = makeQueryClient();

  for (const workout of workouts) {
    queryClient.setQueryData(
      workoutKeys.engagement(viewerId, workout.id),
      toWorkoutEngagement(workout),
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
