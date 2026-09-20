import { DirectionalPageTransition } from '@/components/view-transitions';
import { HomeContent } from '@/features/home';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mini Workout',
};

export default function HomePage() {
  return (
    <DirectionalPageTransition>
      <HomeContent />
    </DirectionalPageTransition>
  );
}
