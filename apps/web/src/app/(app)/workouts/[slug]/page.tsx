import { AnimatedSuspense } from '@/components/animated-suspense';
import { MainLayout } from '@/components/layout/main-layout';
import { WorkoutDetailSkeleton } from '@/components/skeletons/workout-detail-skeleton';
import { DirectionalPageTransition } from '@/components/view-transitions';
import type { WorkoutTransitionSource } from '@/components/view-transitions/workout-thumbnail';
import { BackButton, WorkoutContent } from '@/features/workouts';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { getPublishedWorkoutMeta as findWorkoutMeta } from '@mini-workout/core/workouts';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { Suspense } from 'react';

async function getPublishedWorkoutMeta(slug: string) {
  'use cache';
  cacheLife('hours');
  cacheTag(CACHE_TAGS.workouts, CACHE_TAGS.workout(slug));
  return findWorkoutMeta({ slug });
}

type WorkoutDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ transition?: string }>;
};

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

function parseTransitionSource(
  value: string | undefined,
): WorkoutTransitionSource | undefined {
  if (
    value === 'home-recommended' ||
    value === 'home-latest' ||
    value === 'favourites'
  ) {
    return value;
  }
  return undefined;
}

async function WorkoutDetailPageContent({
  params,
  searchParams,
}: WorkoutDetailPageProps) {
  const [{ slug }, { transition }] = await Promise.all([params, searchParams]);

  return (
    <WorkoutContent
      slug={slug}
      transitionSource={parseTransitionSource(transition)}
    />
  );
}

export default function WorkoutDetailPage({
  params,
  searchParams,
}: WorkoutDetailPageProps) {
  return (
    <DirectionalPageTransition>
      <MainLayout>
        <article className="max-w-3xl">
          <Suspense fallback={null}>
            <BackButton />
          </Suspense>
          <AnimatedSuspense
            fallback={<WorkoutDetailSkeleton />}
            variant="reveal"
          >
            <WorkoutDetailPageContent
              params={params}
              searchParams={searchParams}
            />
          </AnimatedSuspense>
        </article>
      </MainLayout>
    </DirectionalPageTransition>
  );
}
