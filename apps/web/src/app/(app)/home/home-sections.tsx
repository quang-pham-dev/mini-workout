import styles from './home.module.css';
import { getGreeting } from '@/features/workouts/presentation';
import {
  WorkoutCard,
  type WorkoutCardData,
} from '@/features/workouts/workout-card';
import { getCurrentSession, getUserProfile } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';

async function requireOnboardedUser() {
  const session = await getCurrentSession();

  if (!session?.user.id) {
    redirect('/login');
  }

  const user = await getUserProfile(session.user.id);

  if (!user?.onboardingCompleted) {
    redirect('/onboarding');
  }

  return { session, user };
}

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

export async function Hero() {
  const session = await getCurrentSession();

  if (!session?.user.id) {
    redirect('/login');
  }

  const displayName = session.user.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();

  return (
    <section className={styles.hero} aria-labelledby="home-title">
      <div>
        <p className={styles.eyebrow}>
          {getGreeting(hour)}, {displayName}
        </p>
        <h1 className={styles.title} id="home-title">
          Make a little room for movement.
        </h1>
      </div>
      <p className={styles.heroCopy}>
        A few good places to start, chosen around the kind of movement you said
        you want more of.
      </p>
    </section>
  );
}

export function HeroFallback() {
  return (
    <section className={styles.hero} aria-hidden>
      <div>
        <h1 className={styles.title}>Make a little room for movement.</h1>
      </div>
      <p className={styles.heroCopy}>
        A few good places to start, chosen around the kind of movement you said
        you want more of.
      </p>
    </section>
  );
}

export async function RecommendedSection() {
  const { session, user } = await requireOnboardedUser();
  const interestIds = user.interests.map(
    ({ interestId }: { interestId: string }) => interestId,
  );

  const recommended = await prisma.workout.findMany({
    where: {
      isPublished: true,
      interests: { some: { interestId: { in: interestIds } } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: withUserId(session.user.id),
  });

  if (recommended.length === 0) {
    return (
      <p className={styles.empty}>
        We’re still finding your first recommendations. Browse the latest
        sessions below to get moving.
      </p>
    );
  }

  return (
    <div className={styles.workoutGrid}>
      {recommended.map((workout: WorkoutCardData) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </div>
  );
}

export async function LatestSection() {
  const { session } = await requireOnboardedUser();

  const latest = await prisma.workout.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take: 6,
    select: withUserId(session.user.id),
  });

  return (
    <div className={styles.workoutGrid}>
      {latest.map((workout: WorkoutCardData) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </div>
  );
}
