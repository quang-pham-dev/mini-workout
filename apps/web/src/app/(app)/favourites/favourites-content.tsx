import styles from './favourites.module.css';
import {
  WorkoutCard,
  type WorkoutCardData,
} from '@/features/workouts/workout-card';
import { getCurrentSession, getUserProfile } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';

function withUserId(userId: string) {
  return {
    id: true,
    title: true,
    slug: true,
    description: true,
    durationMinutes: true,
    level: true,
    thumbnailUrl: true,
    coach: { select: { name: true } },
    category: { select: { name: true } },
    _count: { select: { likes: true } },
    likes: {
      where: { userId },
      select: { userId: true },
    },
    favorites: {
      where: { userId },
      select: { userId: true },
    },
  };
}

export async function FavouritesContent() {
  const session = await getCurrentSession();

  if (!session?.user.id) {
    redirect('/login');
  }

  const user = await getUserProfile(session.user.id);
  if (!user?.onboardingCompleted) {
    redirect('/onboarding');
  }

  const savedWorkouts = await prisma.workout.findMany({
    where: {
      isPublished: true,
      favorites: {
        some: {
          userId: session.user.id,
        },
      },
    },
    orderBy: {
      favorites: {
        _count: 'desc',
      },
    },
    select: withUserId(session.user.id),
  });

  return (
    <>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Your Library</p>
        <h1 className={styles.title}>
          Saved Sessions
          {savedWorkouts.length > 0 && (
            <span className={styles.countBadge}>{savedWorkouts.length}</span>
          )}
        </h1>
        <p className={styles.subtitle}>
          Workouts you have saved for quick access. Revisit your favorite flows anytime.
        </p>
      </header>

      {savedWorkouts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            ★
          </div>
          <h2 className={styles.emptyTitle}>No saved workouts yet</h2>
          <p className={styles.emptyText}>
            When you find a session you love or want to try later, click the Star icon to keep it here.
          </p>
          <Link className={styles.exploreBtn} href="/home">
            Explore Workouts
          </Link>
        </div>
      ) : (
        <div className={styles.workoutGrid}>
          {savedWorkouts.map((workout: WorkoutCardData) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </>
  );
}
