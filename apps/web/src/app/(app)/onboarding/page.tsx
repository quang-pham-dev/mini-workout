import { OnboardingContent } from './onboarding-content';
import { OnboardingFormSkeleton } from '@/components/skeletons/onboarding-form-skeleton';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Build your starting plan | Mini Workout',
};

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default function OnboardingPage({ searchParams }: OnboardingPageProps) {
  return (
    <Suspense fallback={<OnboardingFormSkeleton />}>
      <OnboardingContent searchParams={searchParams} />
    </Suspense>
  );
}
