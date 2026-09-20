'use client';

import {
  WorkoutApiError,
  setWorkoutFavorited,
  setWorkoutLiked,
} from '@/lib/workouts/api';
import { workoutKeys } from '@/lib/workouts/cache';
import {
  applyFavoritePreference,
  applyLikePreference,
} from '@/lib/workouts/engagement-state';
import { workoutEngagementQueryOptions } from '@/lib/workouts/query-options';
import type { WorkoutEngagement } from '@mini-workout/core/workouts';
import {
  useIsMutating,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

function mutationErrorMessage(error: unknown) {
  if (!(error instanceof WorkoutApiError)) {
    return 'Could not save your change. Please try again.';
  }

  return error.requestId
    ? `${error.message} Reference: ${error.requestId}`
    : error.message;
}

export function useWorkoutEngagement(viewerId: string, workoutId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = workoutKeys.engagement(viewerId, workoutId);
  const mutationKey = [...queryKey, 'mutation'] as const;
  const { data } = useSuspenseQuery(
    workoutEngagementQueryOptions(viewerId, workoutId),
  );

  const createMutationOptions = (
    update: (current: WorkoutEngagement, desired: boolean) => WorkoutEngagement,
  ) => ({
    scope: { id: `workout-engagement:${viewerId}:${workoutId}` },
    onMutate: async (desired: boolean) => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData<WorkoutEngagement>(queryKey);

      if (previous)
        queryClient.setQueryData(queryKey, update(previous, desired));
      return { previous };
    },
    onError: (
      error: unknown,
      _desired: boolean,
      context?: { previous?: WorkoutEngagement },
    ) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
      toast.error(mutationErrorMessage(error));
    },
    onSuccess: (engagement: WorkoutEngagement) => {
      queryClient.setQueryData(queryKey, engagement);
      router.refresh();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey, exact: true }),
  });

  const likeMutation = useMutation({
    mutationKey: [...mutationKey, 'like'],
    mutationFn: (liked: boolean) => setWorkoutLiked(workoutId, liked),
    ...createMutationOptions(applyLikePreference),
  });
  const favoriteMutation = useMutation({
    mutationKey: [...mutationKey, 'favorite'],
    mutationFn: (favorited: boolean) =>
      setWorkoutFavorited(workoutId, favorited),
    ...createMutationOptions(applyFavoritePreference),
  });
  const pendingMutationCount = useIsMutating({ mutationKey });

  return {
    engagement: data,
    isPending: pendingMutationCount > 0,
    setLiked: likeMutation.mutate,
    setFavorited: favoriteMutation.mutate,
  };
}
