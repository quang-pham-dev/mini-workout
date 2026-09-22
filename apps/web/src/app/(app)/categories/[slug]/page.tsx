import { AnimatedSuspense } from '@/components/animated-suspense';
import { MainLayout } from '@/components/layout/main-layout';
import { DirectionalPageTransition } from '@/components/view-transitions';
import {
  CategoryWorkoutsSection,
  CategoryWorkoutsSkeleton,
} from '@/features/categories';
import type { Metadata } from 'next';

type CategoryPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug.replaceAll('-', ' ')} workouts | Mini Workout` };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <DirectionalPageTransition>
      <MainLayout>
        <AnimatedSuspense fallback={<CategoryWorkoutsSkeleton />}>
          <CategoryWorkoutsRoute params={params} />
        </AnimatedSuspense>
      </MainLayout>
    </DirectionalPageTransition>
  );
}

async function CategoryWorkoutsRoute({ params }: CategoryPageProps) {
  const { slug } = await params;
  return <CategoryWorkoutsSection slug={slug} />;
}
