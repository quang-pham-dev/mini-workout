import styles from './home.module.css';
import { formatDuration, getGreeting } from '@/features/workouts/presentation';
import { WorkoutActions } from '@/features/workouts/workout-actions';
import { getCurrentSession, getUserProfile } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import type { ExperienceLevel } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type WorkoutCardData = {
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

function WorkoutCard({ workout }: { workout: WorkoutCardData }) {
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
