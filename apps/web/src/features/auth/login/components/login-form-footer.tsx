'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';

export function LoginFormFooter() {
  const { pending } = useFormStatus();

  return (
    <div className="mt-5 grid gap-2 text-center text-sm text-text-secondary [&_a]:font-semibold [&_a]:text-primary">
      <Link href="/forgot-password">Forgot your password?</Link>
      <span>
        New to Mini Workout?{' '}
        <Link
          aria-disabled={pending}
          className={pending ? 'pointer-events-none opacity-50' : ''}
          href="/register"
          tabIndex={pending ? -1 : undefined}
        >
          Create an account
        </Link>
      </span>
    </div>
  );
}
