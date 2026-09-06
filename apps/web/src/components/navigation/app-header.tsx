import { NavLinks, NavLinksFallback } from './nav-links';
import { ThemeToggle } from '@/components/theme/theme';
import { getInitials } from '@/lib/auth/initials';
import { getCurrentSession } from '@/lib/auth/session';
import Link from 'next/link';
import { Suspense } from 'react';

async function HeaderSessionNav() {
  const session = await getCurrentSession();
  const initials = getInitials(session?.user?.name, session?.user?.email);

  return (
    <NavLinks
      userInitials={initials}
      userName={session?.user?.name || undefined}
      userEmail={session?.user?.email || undefined}
    />
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-[color-mix(in_oklch,var(--color-background)_85%,transparent)] backdrop-blur-[16px]">
      <div className="relative mx-auto flex max-w-[76rem] items-center justify-between px-[clamp(1rem,5vw,5rem)] py-[0.9rem]">
        <Link
          className="font-display text-[1.15rem] font-extrabold tracking-[-0.04em] text-text-primary no-underline transition-opacity hover:opacity-85"
          href="/home"
        >
          mini / workout
        </Link>

        <div className="flex items-center gap-3">
          <Suspense fallback={<NavLinksFallback />}>
            <HeaderSessionNav />
          </Suspense>
          <ThemeToggle className="max-[768px]:hidden" />
        </div>
      </div>
    </header>
  );
}
