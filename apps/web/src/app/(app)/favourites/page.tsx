import { FavouritesContent } from './favourites-content';
import styles from './favourites.module.css';
import { HomeFeedSkeleton } from '@/components/skeletons/home-feed-skeleton';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Favourites | Mini Workout',
  description: 'Your saved workout sessions and flows.',
};

export default function FavouritesPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Suspense fallback={<HomeFeedSkeleton count={6} />}>
          <FavouritesContent />
        </Suspense>
      </div>
    </main>
  );
}
