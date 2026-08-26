import styles from './workout-card.module.css';
import { formatDuration } from './presentation';
import { WorkoutActions } from './workout-actions';
import type { ExperienceLevel } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';

export type WorkoutCardData = {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  level: ExperienceLevel;
  thumbnailUrl: string;
  coach: { name: string };
  category: { name: string };
  _count: { likes: number };
  likes: { userId: string }[];
  favorites: { userId: string }[];
};

export function WorkoutCard({ workout }: { workout: WorkoutCardData }) {
  return (
    <article className={styles.workoutCard}>
      <Image
        className={styles.thumbnail}
        src={workout.thumbnailUrl}
        alt=""
        width={1200}
        height={900}
      />
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span className={styles.cardCategory}>{workout.category.name}</span>
          <span>{formatDuration(workout.durationMinutes)}</span>
        </div>
        <h3 className={styles.cardTitle}>
          <Link className={styles.cardLink} href={`/workouts/${workout.slug}`}>
            {workout.title}
          </Link>
        </h3>
        <p className={styles.cardDescription}>{workout.description}</p>
        <p className={styles.coach}>with {workout.coach.name}</p>
        <WorkoutActions
          workoutId={workout.id}
          likeCount={workout._count.likes}
          liked={workout.likes.length > 0}
          favorited={workout.favorites.length > 0}
        />
      </div>
    </article>
  );
}
