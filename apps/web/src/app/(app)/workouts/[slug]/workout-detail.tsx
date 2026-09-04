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
    <main className="min-h-[100svh] bg-background px-[clamp(1rem,5vw,5rem)] py-[clamp(1.25rem,5vw,5rem)] text-text-primary">
      <article className="mx-auto max-w-6xl">
        <Link
          className="text-[0.9rem] text-text-secondary no-underline hover:text-text-primary focus-visible:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-visible:outline-offset-4"
          href="/home"
        >
          ← Back to your week
        </Link>
        <div className="relative mt-8 overflow-hidden rounded-3xl bg-surface-sunken [&_img]:block [&_img]:max-h-[32rem] [&_img]:w-full [&_img]:object-cover">
          <Image
            src={workout.thumbnailUrl}
            alt=""
            width={1200}
            height={800}
            priority
          />
          <div className="absolute right-4 bottom-4 rounded-full bg-[oklch(0.1_0_0/0.72)] px-3 py-2 text-[0.8rem] text-white">
            Video placeholder
          </div>
        </div>
        <div className="max-w-3xl py-[clamp(2rem,6vw,5rem)]">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-highlight">
            {workout.category.name}
          </p>
          <h1 className="text-balance font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.065em]">
            {workout.title}
          </h1>
          <p className="mt-6 text-[1.1rem] leading-[1.65] text-text-secondary">
            {workout.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-[0.65rem] text-[0.85rem] text-text-secondary [&_span]:rounded-full [&_span]:bg-highlight-soft [&_span]:px-[0.7rem] [&_span]:py-[0.45rem] [&_span]:text-highlight-foreground">
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
          <div className="mt-12 border-t border-border-subtle pt-6">
            <strong>Meet {workout.coach.name}</strong>
            <p className="mt-2 text-text-secondary">{workout.coach.bio}</p>
          </div>
        </div>
      </article>
    </main>
  );
}
