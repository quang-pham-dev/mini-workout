import styles from './workout-detail.module.css';
import { formatDuration } from '@/features/workouts/presentation';
import { WorkoutActions } from '@/features/workouts/workout-actions';
import { getCurrentSession, getUserProfile } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

type WorkoutDetailProps = {
  params: Promise<{ slug: string }>;
};

export async function WorkoutDetail({ params }: WorkoutDetailProps) {
  const session = await getCurrentSession();

  if (!session?.user.id) redirect('/login');

  const user = await getUserProfile(session.user.id);
  if (!user?.onboardingCompleted) redirect('/onboarding');

  const { slug } = await params;
  const workout = await prisma.workout.findUnique({
    where: { slug, isPublished: true },
    include: {
      coach: true,
      category: true,
      _count: { select: { likes: true } },
      likes: {
        where: { userId: session.user.id },
        select: { userId: true },
      },
      favorites: {
        where: { userId: session.user.id },
        select: { userId: true },
      },
    },
  });

  if (!workout) notFound();

  return (
    <main className={styles.page}>
      <article className={styles.shell}>
        <Link className={styles.backLink} href="/home">
          ← Back to your week
        </Link>
        <div className={styles.media}>
          <Image
            src={workout.thumbnailUrl}
            alt=""
            width={1200}
            height={800}
            priority
          />
          <div className={styles.playHint}>Video placeholder</div>
        </div>
        <div className={styles.content}>
          <p className={styles.eyebrow}>{workout.category.name}</p>
          <h1>{workout.title}</h1>
          <p className={styles.description}>{workout.description}</p>
          <div className={styles.meta}>
            <span>{formatDuration(workout.durationMinutes)}</span>
            <span>{workout.level.toLowerCase()}</span>
            <span>with {workout.coach.name}</span>
          </div>
          <WorkoutActions
            workoutId={workout.id}
            likeCount={workout._count.likes}
            liked={workout.likes.length > 0}
            favorited={workout.favorites.length > 0}
          />
          <div className={styles.coach}>
            <strong>Meet {workout.coach.name}</strong>
            <p>{workout.coach.bio}</p>
          </div>
        </div>
      </article>
    </main>
  );
}
