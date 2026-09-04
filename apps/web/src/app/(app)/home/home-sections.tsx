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
    <section
      className="mt-[clamp(3rem,8vw,8rem)] grid grid-cols-[minmax(0,1fr)_minmax(15rem,0.6fr)] items-end gap-8 max-[680px]:mt-16 max-[680px]:grid-cols-1"
      aria-labelledby="home-title"
    >
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-highlight">
          {getGreeting(hour)}, {displayName}
        </p>
        <h1
          className="text-balance font-display text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.92] tracking-[-0.07em]"
          id="home-title"
        >
          Make a little room for movement.
        </h1>
      </div>
      <p className="mb-2 max-w-96 text-[1.05rem] leading-[1.6] text-text-secondary">
        A few good places to start, chosen around the kind of movement you said
        you want more of.
      </p>
    </section>
  );
}

export function HeroFallback() {
  return (
    <section
      className="mt-[clamp(3rem,8vw,8rem)] grid grid-cols-[minmax(0,1fr)_minmax(15rem,0.6fr)] items-end gap-8 max-[680px]:mt-16 max-[680px]:grid-cols-1"
      aria-hidden
    >
      <div>
        <h1 className="text-balance font-display text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.92] tracking-[-0.07em]">
          Make a little room for movement.
        </h1>
      </div>
      <p className="mb-2 max-w-96 text-[1.05rem] leading-[1.6] text-text-secondary">
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
      <p className="rounded-2xl border border-dashed border-border-default p-8 text-text-secondary">
        We’re still finding your first recommendations. Browse the latest
        sessions below to get moving.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[680px]:grid-cols-1">
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
    <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[680px]:grid-cols-1">
      {latest.map((workout: WorkoutCardData) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </div>
  );
}
