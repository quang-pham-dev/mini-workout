'use client';

import {
  toggleWorkoutFavorite,
  toggleWorkoutLike,
} from '../../features/workouts/actions';
import { Button, cn } from '@mini-workout/ui';
import { useState, useTransition } from 'react';

export function WorkoutActions({
  workoutId,
  likeCount,
  liked,
  favorited,
}: {
  workoutId: string;
  likeCount: number;
  liked: boolean;
  favorited: boolean;
}) {
  const [isLiked, setIsLiked] = useState(liked);
  const [likes, setLikes] = useState(likeCount);
  const [isFavorited, setIsFavorited] = useState(favorited);
  const [isPending, startTransition] = useTransition();

  function handleLike() {
    const previous = { isLiked, likes };
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikes((count) => count + (nextLiked ? 1 : -1));
    startTransition(async () => {
      try {
        await toggleWorkoutLike(workoutId);
      } catch {
        setIsLiked(previous.isLiked);
        setLikes(previous.likes);
      }
    });
  }

  function handleFavorite() {
    const previous = isFavorited;
    setIsFavorited((value) => !value);
    startTransition(async () => {
      try {
        await toggleWorkoutFavorite(workoutId);
      } catch {
        setIsFavorited(previous);
      }
    });
  }

  return (
    <div className="mt-4 flex items-center gap-2" aria-label="Workout actions">
      <Button
        className={cn(
          'inline-flex min-h-9 items-center gap-[0.35rem] rounded-full border border-border-default bg-surface px-[0.7rem] py-[0.45rem] text-[0.8rem] text-text-secondary transition-[border-color,background-color,color] duration-[160ms] enabled:hover:border-border-strong enabled:hover:text-text-primary disabled:cursor-wait disabled:opacity-65 motion-reduce:transition-none focus-visible:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-visible:outline-offset-2',
          isLiked &&
            '!border-highlight !bg-highlight-soft !text-highlight-foreground enabled:hover:!border-highlight enabled:hover:!text-highlight-foreground',
        )}
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={isLiked}
        aria-label={isLiked ? 'Unlike workout' : 'Like workout'}
        disabled={isPending}
        onClick={handleLike}
      >
        <span aria-hidden="true">{isLiked ? '♥' : '♡'}</span>
        <span>{likes}</span>
      </Button>
      <Button
        className={cn(
          'inline-flex min-h-9 items-center gap-[0.35rem] rounded-full border border-border-default bg-surface px-[0.7rem] py-[0.45rem] text-[0.8rem] text-text-secondary transition-[border-color,background-color,color] duration-[160ms] enabled:hover:border-border-strong enabled:hover:text-text-primary disabled:cursor-wait disabled:opacity-65 motion-reduce:transition-none focus-visible:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-visible:outline-offset-2',
          isFavorited &&
            '!border-highlight !bg-highlight-soft !text-highlight-foreground enabled:hover:!border-highlight enabled:hover:!text-highlight-foreground',
        )}
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={isFavorited}
        aria-label={
          isFavorited ? 'Remove from favourites' : 'Save to favourites'
        }
        disabled={isPending}
        onClick={handleFavorite}
      >
        <span aria-hidden="true">{isFavorited ? '★' : '☆'}</span>
        <span>{isFavorited ? 'Saved' : 'Save'}</span>
      </Button>
      <span className="min-w-14 text-xs text-text-tertiary" aria-live="polite">
        {isPending ? 'Saving…' : ''}
      </span>
    </div>
  );
}
