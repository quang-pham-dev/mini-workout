import { AnimatedSuspense } from '@/components/animated-suspense';
import { MainLayout } from '@/components/layout/main-layout';
import { WorkoutDetailSkeleton } from '@/components/skeletons/workout-detail-skeleton';
import { WorkoutContent } from '@/features/workouts';
import { getPublishedWorkoutMeta as findWorkoutMeta } from '@mini-workout/core/workouts';
import type { Metadata } from 'next';
import Link from 'next/link';

async function getPublishedWorkoutMeta(slug: string) {
  'use cache';
  return findWorkoutMeta({ slug });
}

type WorkoutDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

type BackConfig = { href: string; label: string };

const BACK_CONFIG = new Map<string, BackConfig>([
  ['home', { href: '/home', label: 'Back to your week' }],
  ['favourites', { href: '/favourites', label: 'Back to favourites' }],
]);

const DEFAULT_BACK: BackConfig = { href: '/home', label: 'Back to your week' };

export async function generateMetadata({
  params,
}: WorkoutDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const workout = await getPublishedWorkoutMeta(slug);

  return {
    title: workout
      ? `${workout.title} | Mini Workout`
      : 'Workout | Mini Workout',
    description: workout?.description,
  };
}

export default async function WorkoutDetailPage({
  params,
  searchParams,
}: WorkoutDetailPageProps) {
  const { from } = await searchParams;
  const back: BackConfig =
    (from != null ? BACK_CONFIG.get(from) : undefined) ?? DEFAULT_BACK;

  return (
    <MainLayout>
      <article className="max-w-3xl">
        <Link
          className="text-[0.9rem] text-text-secondary no-underline hover:text-text-primary focus-visible:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-visible:outline-offset-4"
          href={back.href}
        >
          ← {back.label}
        </Link>
        <AnimatedSuspense fallback={<WorkoutDetailSkeleton />}>
          <WorkoutContent params={params} />
        </AnimatedSuspense>
      </article>
    </MainLayout>
  );
}
