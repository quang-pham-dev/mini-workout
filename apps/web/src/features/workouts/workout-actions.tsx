'use client';

import { toggleWorkoutFavorite, toggleWorkoutLike } from './actions';
import styles from './workout-actions.module.css';
import { Button } from '@mini-workout/ui';
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
    <div className={styles.actions} aria-label="Workout actions">
      <Button
        className={`${styles.action} ${isLiked ? styles.active : ''}`}
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
        className={`${styles.action} ${isFavorited ? styles.active : ''}`}
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
      <span className={styles.status} aria-live="polite">
        {isPending ? 'Saving…' : ''}
      </span>
    </div>
  );
}
