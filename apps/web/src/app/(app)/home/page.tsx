import {
  Hero,
  HeroFallback,
  LatestSection,
  RecommendedSection,
} from './home-sections';
import { HomeFeedSkeleton } from '@/components/skeletons/home-feed-skeleton';
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <main className="min-h-[100svh] bg-background px-[clamp(1rem,5vw,5rem)] text-text-primary">
      <div className="mx-auto max-w-[76rem]">
        <Suspense fallback={<HeroFallback />}>
          <Hero />
        </Suspense>

        <section className="mt-12" aria-labelledby="recommended-title">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="m-0 text-[1.35rem] tracking-[-0.03em]"
              id="recommended-title"
            >
              For your week
            </h2>
            <span className="text-[0.85rem] text-text-tertiary">
              Based on your focus
            </span>
          </div>
          <Suspense fallback={<HomeFeedSkeleton count={3} />}>
            <RecommendedSection />
          </Suspense>
        </section>

        <section className="mt-12" aria-labelledby="latest-title">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="m-0 text-[1.35rem] tracking-[-0.03em]"
              id="latest-title"
            >
              Fresh sessions
            </h2>
            <span className="text-[0.85rem] text-text-tertiary">
              New in the library
            </span>
          </div>
          <Suspense fallback={<HomeFeedSkeleton count={6} />}>
            <LatestSection />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
