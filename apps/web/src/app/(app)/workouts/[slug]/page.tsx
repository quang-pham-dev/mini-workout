import { AnimatedSuspense } from '@/components/animated-suspense';
import { MainLayout } from '@/components/layout/main-layout';
import { WorkoutDetailSkeleton } from '@/components/skeletons/workout-detail-skeleton';
import { WorkoutContent } from '@/features/workouts';
import { prisma } from '@/lib/db/prisma';
import type { Metadata } from 'next';
import Link from 'next/link';

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
    <MainLayout>
      <article className="max-w-3xl">
        <Link
          className="text-[0.9rem] text-text-secondary no-underline hover:text-text-primary focus-visible:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-visible:outline-offset-4"
          href="/home"
        >
          ← Back to your week
        </Link>
        <AnimatedSuspense fallback={<WorkoutDetailSkeleton />}>
          <WorkoutContent params={params} />
        </AnimatedSuspense>
      </article>
    </MainLayout>
  );
}
