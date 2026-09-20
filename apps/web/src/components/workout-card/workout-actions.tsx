'use client';

import { useWorkoutEngagement } from '@/hooks/use-workout-engagement';
import { Button, cn } from '@mini-workout/ui';

export function WorkoutActions({
  viewerId,
  workoutId,
}: {
  viewerId: string;
  workoutId: string;
}) {
  const { engagement, isPending, setFavorited, setLiked } =
    useWorkoutEngagement(viewerId, workoutId);

  function handleLike() {
    setLiked(!engagement.liked);
  }

  function handleFavorite() {
    setFavorited(!engagement.favorited);
  }

  return (
    <div className="mt-4 flex items-center gap-2" aria-label="Workout actions">
      <Button
        className={cn(
          'inline-flex min-h-9 items-center gap-[0.35rem] rounded-full border border-border-default bg-surface px-[0.7rem] py-[0.45rem] text-[0.8rem] text-text-secondary transition-[border-color,background-color,color] duration-[160ms] enabled:hover:border-border-strong enabled:hover:text-text-primary disabled:cursor-wait disabled:opacity-65 motion-reduce:transition-none focus-visible:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-visible:outline-offset-2',
          engagement.liked &&
            '!border-highlight !bg-highlight-soft !text-highlight-foreground enabled:hover:!border-highlight enabled:hover:!text-highlight-foreground',
        )}
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={engagement.liked}
        aria-label={engagement.liked ? 'Unlike workout' : 'Like workout'}
        disabled={isPending}
        onClick={handleLike}
      >
        <span aria-hidden="true">{engagement.liked ? '♥' : '♡'}</span>
        <span>{engagement.likeCount}</span>
      </Button>
      <Button
        className={cn(
          'inline-flex min-h-9 items-center gap-[0.35rem] rounded-full border border-border-default bg-surface px-[0.7rem] py-[0.45rem] text-[0.8rem] text-text-secondary transition-[border-color,background-color,color] duration-[160ms] enabled:hover:border-border-strong enabled:hover:text-text-primary disabled:cursor-wait disabled:opacity-65 motion-reduce:transition-none focus-visible:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-visible:outline-offset-2',
          engagement.favorited &&
            '!border-highlight !bg-highlight-soft !text-highlight-foreground enabled:hover:!border-highlight enabled:hover:!text-highlight-foreground',
        )}
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={engagement.favorited}
        aria-label={
          engagement.favorited ? 'Remove from favourites' : 'Save to favourites'
        }
        disabled={isPending}
        onClick={handleFavorite}
      >
        <span aria-hidden="true">{engagement.favorited ? '★' : '☆'}</span>
        <span>{engagement.favorited ? 'Saved' : 'Save'}</span>
      </Button>
      <span className="min-w-14 text-xs text-text-tertiary" aria-live="polite">
        {isPending ? 'Saving…' : ''}
      </span>
    </div>
  );
}
