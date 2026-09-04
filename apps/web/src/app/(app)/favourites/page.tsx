import { FavouritesContent } from './favourites-content';
import { HomeFeedSkeleton } from '@/components/skeletons/home-feed-skeleton';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Favourites | Mini Workout',
  description: 'Your saved workout sessions and flows.',
};

export default function FavouritesPage() {
  return (
    <main className="min-h-[100svh] bg-background px-[clamp(1rem,5vw,5rem)] py-[clamp(2rem,7vw,6rem)] text-text-primary">
      <div className="mx-auto max-w-[76rem]">
        <Suspense fallback={<HomeFeedSkeleton count={6} />}>
          <FavouritesContent />
        </Suspense>
      </div>
    </main>
  );
}
