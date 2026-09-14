import { AnimatedSuspense } from '@/components/animated-suspense';
import { MainLayout } from '@/components/layout/main-layout';
import { ProfileSkeleton } from '@/components/skeletons/profile-skeleton';
import { ProfileContent } from '@/features/profile';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Profile | Mini Workout',
  description: 'Manage your workout preferences and account details.',
};

export default function ProfilePage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl">
        <AnimatedSuspense fallback={<ProfileSkeleton />}>
          <ProfileContent />
        </AnimatedSuspense>
      </div>
    </MainLayout>
  );
}
