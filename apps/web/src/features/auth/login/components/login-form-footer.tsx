'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';

export function LoginFormFooter() {
  const { pending } = useFormStatus();

  return (
    <p className="mt-5 text-center text-sm text-text-secondary [&_a]:font-semibold [&_a]:text-primary">
      New to Mini Workout?{' '}
      <Link
        aria-disabled={pending}
        className={pending ? 'pointer-events-none opacity-50' : ''}
        href="/register"
        tabIndex={pending ? -1 : undefined}
      >
        Create an account
      </Link>
    </p>
  );
}
