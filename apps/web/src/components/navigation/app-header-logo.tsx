'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppHeaderLogo() {
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith('/onboarding');

  if (isOnboarding) {
    return (
      <span className="font-display text-[1.15rem] font-extrabold tracking-[-0.04em] text-text-primary">
        mini / workout
      </span>
    );
  }

  return (
    <Link
      className="font-display text-[1.15rem] font-extrabold tracking-[-0.04em] text-text-primary no-underline transition-opacity hover:opacity-85"
      href="/home"
    >
      mini / workout
    </Link>
  );
}
