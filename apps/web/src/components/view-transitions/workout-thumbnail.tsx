import { ViewTransition } from 'react';

export type WorkoutTransitionSource =
  'home-recommended' | 'home-latest' | 'favourites';

export function getWorkoutThumbnailTransitionName(
  workoutId: string,
  source: WorkoutTransitionSource,
) {
  return `workout-thumbnail-${source}-${workoutId}`;
}

type WorkoutThumbnailTransitionProps = {
  children: React.ReactNode;
  source?: WorkoutTransitionSource;
  workoutId: string;
};

export function WorkoutThumbnailTransition({
  children,
  source,
  workoutId,
}: WorkoutThumbnailTransitionProps) {
  if (!source) return children;

  return (
    <ViewTransition
      name={getWorkoutThumbnailTransitionName(workoutId, source)}
      share="morph"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
