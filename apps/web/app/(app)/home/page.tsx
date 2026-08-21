import { auth } from '../../../auth';
import {
  formatDuration,
  getGreeting,
} from '../../../features/workouts/presentation';
import { prisma } from '../../../lib/db/prisma';
import styles from './home.module.css';
import type { ExperienceLevel } from '@prisma/client';
import { headers } from 'next/headers';
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
      </div>
    </article>
  );
}

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingCompleted: true,
      interests: { select: { interestId: true } },
    },
  });

  if (!user?.onboardingCompleted) redirect('/onboarding');

  const interestIds = user.interests.map(({ interestId }) => interestId);
  const workoutSelect = {
    id: true,
    title: true,
    slug: true,
    description: true,
    durationMinutes: true,
    level: true,
    thumbnailUrl: true,
    coach: { select: { name: true } },
    category: { select: { name: true } },
  } as const;

  const [recommended, latest] = await Promise.all([
    prisma.workout.findMany({
      where: {
        isPublished: true,
        interests: { some: { interestId: { in: interestIds } } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: workoutSelect,
    }),
    prisma.workout.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: 6,
      select: workoutSelect,
    }),
  ]);

  const displayName = session.user.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/home">
            mini / workout
          </Link>
          <span className={styles.sectionNote}>Your movement library</span>
        </header>

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
            A few good places to start, chosen around the kind of movement you
            said you want more of.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="recommended-title">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle} id="recommended-title">
              For your week
            </h2>
            <span className={styles.sectionNote}>Based on your focus</span>
          </div>
          {recommended.length > 0 ? (
            <div className={styles.workoutGrid}>
              {recommended.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              We’re still finding your first recommendations. Browse the latest
              sessions below to get moving.
            </p>
          )}
        </section>

        <section className={styles.section} aria-labelledby="latest-title">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle} id="latest-title">
              Fresh sessions
            </h2>
            <span className={styles.sectionNote}>New in the library</span>
          </div>
          <div className={styles.workoutGrid}>
            {latest.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        </section>

        <div className={styles.signOutRow}>
          <span className={styles.sectionNote}>
            Keep showing up for yourself.
          </span>
          <form
            action={async () => {
              'use server';
              await auth.api.signOut({ headers: await headers() });
            }}
          >
            <button className={styles.signOut} type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
