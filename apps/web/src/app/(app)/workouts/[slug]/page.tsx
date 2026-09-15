import { BackButton } from './back-button';
import { AnimatedSuspense } from '@/components/animated-suspense';
import { MainLayout } from '@/components/layout/main-layout';
import { WorkoutDetailSkeleton } from '@/components/skeletons/workout-detail-skeleton';
import { WorkoutContent } from '@/features/workouts';
import { getPublishedWorkoutMeta as findWorkoutMeta } from '@mini-workout/core/workouts';
import type { Metadata } from 'next';
import { Suspense } from 'react';

async function getPublishedWorkoutMeta(slug: string) {
  'use cache';
  return findWorkoutMeta({ slug });
}

type WorkoutDetailPageProps = {
  params: Promise<{ slug: string }>;
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

export default function WorkoutDetailPage({ params }: WorkoutDetailPageProps) {
  return (
    <MainLayout>
      <article className="max-w-3xl">
        <Suspense fallback={null}>
          <BackButton />
        </Suspense>
        <AnimatedSuspense fallback={<WorkoutDetailSkeleton />}>
          <WorkoutContent params={params} />
        </AnimatedSuspense>
      </article>
    </MainLayout>
  );
}
