import styles from './app-header.module.css';
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
    <header className={styles.header}>
      <div className={styles.container}>
        <Link className={styles.brand} href="/home">
          mini / workout
        </Link>

        <div className={styles.headerActions}>
          <ThemeToggle />
          <Suspense fallback={<NavLinksFallback />}>
            <HeaderSessionNav />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
