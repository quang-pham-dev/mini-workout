import { AnimatedSuspense } from '@/components/animated-suspense';
import { OnboardingFormSkeleton } from '@/components/skeletons/onboarding-form-skeleton';
import { OnboardingContent } from '@/features/onboarding';
import { SearchParams } from '@/types/common';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Build your starting plan | Mini Workout',
};

type OnboardingPageProps = {
  searchParams: SearchParams;
};

export default function OnboardingPage({ searchParams }: OnboardingPageProps) {
  return (
    <AnimatedSuspense fallback={<OnboardingFormSkeleton />}>
      <OnboardingContent searchParams={searchParams} />
    </AnimatedSuspense>
  );
}
