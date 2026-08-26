import { ProfileContent } from './profile-content';
import styles from './profile.module.css';
import { ProfileSkeleton } from '@/components/skeletons/profile-skeleton';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Your Profile | Mini Workout',
  description: 'Manage your workout preferences and account details.',
};

export default function ProfilePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileContent />
        </Suspense>
      </div>
    </main>
  );
}
