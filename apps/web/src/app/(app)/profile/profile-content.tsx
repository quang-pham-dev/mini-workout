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
      <header className="mb-8 flex items-center gap-6 border-b border-border-subtle pb-8 max-[640px]:flex-col max-[640px]:items-start">
        <div
          className="grid size-[4.5rem] shrink-0 place-items-center rounded-full border-2 border-border-subtle bg-surface-sunken font-display text-[1.75rem] font-bold tracking-[-0.02em]"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-[1.1] tracking-[-0.04em]">
            {userFull.name}
          </h1>
          <p className="text-[0.95rem] text-text-secondary">{userFull.email}</p>
          <span className="text-[0.8rem] text-text-tertiary">
            Member since {memberSince}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <section
          className="rounded-[1.25rem] border border-border-subtle bg-surface p-6"
          aria-labelledby="activity-title"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2
              className="text-[1.15rem] font-semibold tracking-[-0.02em]"
              id="activity-title"
            >
              Your Activity
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 rounded-[0.875rem] bg-surface-sunken p-5">
              <span className="font-display text-[1.85rem] font-bold tracking-[-0.03em]">
                {userFull._count.favorites}
              </span>
              <span className="text-[0.825rem] text-text-secondary">
                Saved Sessions
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-[0.875rem] bg-surface-sunken p-5">
              <span className="font-display text-[1.85rem] font-bold tracking-[-0.03em]">
                {userFull._count.likes}
              </span>
              <span className="text-[0.825rem] text-text-secondary">
                Liked Workouts
              </span>
            </div>
          </div>
        </section>

        <section
          className="rounded-[1.25rem] border border-border-subtle bg-surface p-6"
          aria-labelledby="preferences-title"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2
              className="text-[1.15rem] font-semibold tracking-[-0.02em]"
              id="preferences-title"
            >
              Movement Focus
            </h2>
            <Link
              className="text-[0.85rem] font-semibold text-highlight-foreground no-underline hover:underline"
              href="/onboarding"
            >
              Edit
            </Link>
          </div>

          <div className="flex items-center justify-between py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-subtle">
            <span className="text-[0.9rem] text-text-secondary">
              Experience Level
            </span>
            <span className="inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--color-highlight)_15%,transparent)] px-[0.85rem] py-[0.35rem] text-[0.825rem] font-bold capitalize text-highlight-foreground">
              {userFull.experienceLevel?.toLowerCase() || 'beginner'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-subtle">
            <span className="text-[0.9rem] text-text-secondary">
              Selected Interests
            </span>
            <div className="flex flex-wrap gap-2">
              {userFull.interests.length > 0 ? (
                userFull.interests.map(({ interest }) => (
                  <span
                    key={interest.id}
                    className="inline-flex items-center rounded-full border border-border-subtle bg-surface-sunken px-[0.85rem] py-[0.35rem] text-[0.825rem] font-medium"
                  >
                    {interest.name}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center rounded-full border border-border-subtle bg-surface-sunken px-[0.85rem] py-[0.35rem] text-[0.825rem] font-medium">
                  None selected
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between border-t border-border-subtle pt-6 max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-4">
          <span className="text-[0.85rem] text-text-tertiary">
            Signed in as {userFull.email}
          </span>
          <form
            action={async () => {
              'use server';
              await auth.api.signOut({ headers: await headers() });
            }}
          >
            <button
              className="rounded-full border border-border-default bg-surface px-5 py-[0.6rem] text-sm font-medium text-text-secondary transition-[background-color,color,border-color] hover:border-border-strong hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
