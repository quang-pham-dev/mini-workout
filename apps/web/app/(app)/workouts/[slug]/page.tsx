import { auth } from '../../../../auth';
import { formatDuration } from '../../../../features/workouts/presentation';
import { prisma } from '../../../../lib/db/prisma';
import styles from './workout-detail.module.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const workout = await prisma.workout.findUnique({
    where: { slug, isPublished: true },
    select: { title: true, description: true },
  });

  return {
    title: workout
      ? `${workout.title} | Mini Workout`
      : 'Workout | Mini Workout',
    description: workout?.description,
  };
}

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true },
  });
  if (!user?.onboardingCompleted) redirect('/onboarding');

  const { slug } = await params;
  const workout = await prisma.workout.findUnique({
    where: { slug, isPublished: true },
    include: { coach: true, category: true },
  });

  if (!workout) notFound();

  return (
    <main className={styles.page}>
      <article className={styles.shell}>
        <a className={styles.backLink} href="/home">
          ← Back to your week
        </a>
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
          <div className={styles.coach}>
            <strong>Meet {workout.coach.name}</strong>
            <p>{workout.coach.bio}</p>
          </div>
        </div>
      </article>
    </main>
  );
}
