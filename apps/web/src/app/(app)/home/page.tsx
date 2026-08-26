import {
  Hero,
  HeroFallback,
  LatestSection,
  RecommendedSection,
} from './home-sections';
import styles from './home.module.css';
import { HomeFeedSkeleton } from '@/components/skeletons/home-feed-skeleton';
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Suspense fallback={<HeroFallback />}>
          <Hero />
        </Suspense>

        <section className={styles.section} aria-labelledby="recommended-title">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle} id="recommended-title">
              For your week
            </h2>
            <span className={styles.sectionNote}>Based on your focus</span>
          </div>
          <Suspense fallback={<HomeFeedSkeleton count={3} />}>
            <RecommendedSection />
          </Suspense>
        </section>

        <section className={styles.section} aria-labelledby="latest-title">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle} id="latest-title">
              Fresh sessions
            </h2>
            <span className={styles.sectionNote}>New in the library</span>
          </div>
          <Suspense fallback={<HomeFeedSkeleton count={6} />}>
            <LatestSection />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
