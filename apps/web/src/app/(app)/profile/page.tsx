import { ProfileContent } from './profile-content';
import { ProfileSkeleton } from '@/components/skeletons/profile-skeleton';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Your Profile | Mini Workout',
  description: 'Manage your workout preferences and account details.',
};

export default function ProfilePage() {
  return (
    <main className="min-h-[100svh] bg-background px-[clamp(1rem,5vw,5rem)] py-[clamp(2rem,7vw,6rem)] text-text-primary">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileContent />
        </Suspense>
      </div>
    </main>
  );
}
