'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type BackConfig = { href: string; label: string };

const BACK_CONFIG = new Map<string, BackConfig>([
  ['home', { href: '/home', label: 'Back to your week' }],
  ['favourites', { href: '/favourites', label: 'Back to favourites' }],
]);

const DEFAULT_BACK: BackConfig = { href: '/home', label: 'Back to your week' };

export function BackButton() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const back =
    (from != null ? BACK_CONFIG.get(from) : undefined) ?? DEFAULT_BACK;

  return (
    <Link
      className="text-[0.9rem] text-text-secondary no-underline hover:text-text-primary focus-visible:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-visible:outline-offset-4"
      href={back.href}
    >
      ← {back.label}
    </Link>
  );
}
