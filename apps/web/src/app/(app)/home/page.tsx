import { DirectionalPageTransition } from '@/components/view-transitions';
import { HomeContent } from '@/features/home';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Mini Workout',
};

export default function HomePage() {
  return (
    <DirectionalPageTransition>
      <Suspense>
        <HomeContent />
      </Suspense>
    </DirectionalPageTransition>
  );
}
