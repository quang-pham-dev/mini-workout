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
      <header className="mb-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-highlight">
          Your Library
        </p>
        <h1 className="mb-3 font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.05em]">
          Saved Sessions
          {savedWorkouts.length > 0 && (
            <span className="ml-3 inline-flex items-center rounded-full bg-surface-sunken px-[0.65rem] py-[0.2rem] align-middle text-[0.85rem] font-semibold text-text-secondary">
              {savedWorkouts.length}
            </span>
          )}
        </h1>
        <p className="max-w-lg text-base leading-[1.6] text-text-secondary">
          Workouts you have saved for quick access. Revisit your favorite flows
          anytime.
        </p>
      </header>

      {savedWorkouts.length === 0 ? (
        <div className="flex flex-col items-center rounded-[1.25rem] border border-dashed border-border-default bg-surface px-6 py-16 text-center">
          <div
            className="mb-4 text-[2.5rem] text-text-tertiary"
            aria-hidden="true"
          >
            ★
          </div>
          <h2 className="mb-2 text-xl font-semibold tracking-[-0.02em]">
            No saved workouts yet
          </h2>
          <p className="mb-6 max-w-96 text-[0.9rem] leading-[1.5] text-text-secondary">
            When you find a session you love or want to try later, click the
            Star icon to keep it here.
          </p>
          <Link
            className="inline-flex items-center justify-center rounded-full bg-text-primary px-5 py-[0.65rem] text-sm font-semibold text-background no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            href="/home"
          >
            Explore Workouts
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
          {savedWorkouts.map((workout: WorkoutCardData) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </>
  );
}
