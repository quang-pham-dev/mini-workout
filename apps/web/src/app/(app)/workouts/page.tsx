import { AnimatedSuspense } from '@/components/animated-suspense';
import { MainLayout } from '@/components/layout/main-layout';
import { HomeFeedSkeleton } from '@/components/skeletons/home-feed-skeleton';
import { DirectionalPageTransition } from '@/components/view-transitions';
import { WorkoutSearchContent } from '@/features/workouts';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore workouts | Mini Workout',
  description: 'Search and filter the Mini Workout library.',
};

type SearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  level?: string | string[];
  cursor?: string | string[];
}>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function optionalParam(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parseLevel(value: string | undefined) {
  return value === 'BEGINNER' ||
    value === 'INTERMEDIATE' ||
    value === 'ADVANCED'
    ? value
    : undefined;
}

export default function WorkoutsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <DirectionalPageTransition>
      <MainLayout>
        <AnimatedSuspense fallback={<HomeFeedSkeleton count={6} />}>
          {searchParams.then((params) => (
            <WorkoutSearchContent
              query={optionalParam(first(params.q))}
              categorySlug={optionalParam(first(params.category))}
              level={parseLevel(first(params.level))}
              cursor={optionalParam(first(params.cursor))}
            />
          ))}
        </AnimatedSuspense>
      </MainLayout>
    </DirectionalPageTransition>
  );
}
