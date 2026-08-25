import { WorkoutDetail } from './workout-detail';
import { WorkoutDetailSkeleton } from '@/components/skeletons/workout-detail-skeleton';
import { prisma } from '@/lib/db/prisma';
import type { Metadata } from 'next';
import { Suspense } from 'react';

async function getPublishedWorkoutMeta(slug: string) {
  'use cache';
  return prisma.workout.findUnique({
    where: { slug, isPublished: true },
    select: { title: true, description: true },
  });
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
    <Suspense fallback={<WorkoutDetailSkeleton />}>
      <WorkoutDetail params={params} />
    </Suspense>
  );
}
