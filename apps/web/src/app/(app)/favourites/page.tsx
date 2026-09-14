import { AnimatedSuspense } from '@/components/animated-suspense';
import { MainLayout } from '@/components/layout/main-layout';
import { HomeFeedSkeleton } from '@/components/skeletons/home-feed-skeleton';
import { FavouritesContent } from '@/features/favourites';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Favourites | Mini Workout',
  description: 'Your saved workout sessions and flows.',
};

export default function FavouritesPage() {
  return (
    <MainLayout>
      <AnimatedSuspense fallback={<HomeFeedSkeleton count={6} />}>
        <FavouritesContent />
      </AnimatedSuspense>
    </MainLayout>
  );
}
