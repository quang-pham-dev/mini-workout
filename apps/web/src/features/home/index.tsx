import { CategoryDiscoverySection } from './components/category-discovery-section';
import { HeroFallbackSection } from './components/hero-fallback-section';
import { HeroSection } from './components/hero-section';
import { LatestSection } from './components/latest-section';
import { OnboardingBannerSection } from './components/onboarding-banner-section';
import { RecommendedSection } from './components/recommended-section';
import { AnimatedSuspense } from '@/components/animated-suspense';
import { MainLayout } from '@/components/layout/main-layout';
import { HomeFeedSkeleton } from '@/components/skeletons/home-feed-skeleton';
import { connection } from 'next/server';

export async function HomeContent() {
  // Home is an authenticated surface. Opt into request-time rendering before
  // any cached catalogue read so production builds never touch Prisma.
  await connection();

  return (
    <MainLayout>
      <div className="pb-[clamp(2.5rem,8vw,6rem)]">
        <AnimatedSuspense fallback={<HeroFallbackSection />}>
          <HeroSection />
        </AnimatedSuspense>

        {/* TODO: add skeleton fallback for onboarding banner section */}
        <AnimatedSuspense fallback={null}>
          <OnboardingBannerSection />
        </AnimatedSuspense>

        <AnimatedSuspense fallback={null}>
          <CategoryDiscoverySection />
        </AnimatedSuspense>

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
          <AnimatedSuspense fallback={<HomeFeedSkeleton count={3} />}>
            <RecommendedSection />
          </AnimatedSuspense>
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
          <AnimatedSuspense fallback={<HomeFeedSkeleton count={6} />}>
            <LatestSection />
          </AnimatedSuspense>
        </section>
      </div>
    </MainLayout>
  );
}
