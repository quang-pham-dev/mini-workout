export const workoutKeys = {
  all: ['workouts'] as const,
  engagements: (viewerId: string) =>
    [...workoutKeys.all, 'engagement', viewerId] as const,
  engagement: (viewerId: string, workoutId: string) =>
    [...workoutKeys.engagements(viewerId), workoutId] as const,
};
