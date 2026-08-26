import styles from './profile.module.css';
import { auth } from '@/auth';
import { getInitials } from '@/lib/auth/initials';
import { getCurrentSession, getUserProfile } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export async function ProfileContent() {
  const session = await getCurrentSession();

  if (!session?.user.id) {
    redirect('/login');
  }

  const user = await getUserProfile(session.user.id);
  if (!user?.onboardingCompleted) {
    redirect('/onboarding');
  }

  // Fetch full details including interests names and counts
  const userFull = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      interests: {
        include: {
          interest: true,
        },
      },
      _count: {
        select: {
          likes: true,
          favorites: true,
        },
      },
    },
  });

  if (!userFull) {
    redirect('/login');
  }

  const initials = getInitials(userFull.name, userFull.email);

  const memberSince = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(userFull.createdAt));

  return (
    <>
      <header className={styles.header}>
        <div className={styles.avatar} aria-hidden="true">
          {initials}
        </div>
        <div className={styles.userInfo}>
          <h1 className={styles.name}>{userFull.name}</h1>
          <p className={styles.email}>{userFull.email}</p>
          <span className={styles.joined}>Member since {memberSince}</span>
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="activity-title">
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle} id="activity-title">
              Your Activity
            </h2>
          </div>
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <span className={styles.statValue}>
                {userFull._count.favorites}
              </span>
              <span className={styles.statLabel}>Saved Sessions</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{userFull._count.likes}</span>
              <span className={styles.statLabel}>Liked Workouts</span>
            </div>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="preferences-title">
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle} id="preferences-title">
              Movement Focus
            </h2>
            <Link className={styles.cardAction} href="/onboarding">
              Edit
            </Link>
          </div>

          <div className={styles.preferenceRow}>
            <span className={styles.preferenceLabel}>Experience Level</span>
            <span className={styles.levelBadge}>
              {userFull.experienceLevel?.toLowerCase() || 'beginner'}
            </span>
          </div>

          <div className={styles.preferenceRow}>
            <span className={styles.preferenceLabel}>Selected Interests</span>
            <div className={styles.tagGroup}>
              {userFull.interests.length > 0 ? (
                userFull.interests.map(({ interest }) => (
                  <span key={interest.id} className={styles.tag}>
                    {interest.name}
                  </span>
                ))
              ) : (
                <span className={styles.tag}>None selected</span>
              )}
            </div>
          </div>
        </section>

        <div className={styles.signOutSection}>
          <span className={styles.signOutNotice}>
            Signed in as {userFull.email}
          </span>
          <form
            action={async () => {
              'use server';
              await auth.api.signOut({ headers: await headers() });
            }}
          >
            <button className={styles.signOutBtn} type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
