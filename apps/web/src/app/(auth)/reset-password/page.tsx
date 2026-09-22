import {
  ResetPasswordForm,
  ResetPasswordFormSkeleton,
} from '@/features/auth/recovery';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Reset password' };

export default function ResetPasswordPage({
  searchParams,
}: PageProps<'/reset-password'>) {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-background px-4 py-8">
      <section
        className="w-[min(100%,28rem)] rounded-2xl border border-border-default bg-surface p-8"
        aria-labelledby="reset-password-title"
      >
        <h1
          className="m-0 text-center text-[1.75rem]"
          id="reset-password-title"
        >
          Choose a new password
        </h1>
        <p className="mb-6 mt-2 text-center text-text-secondary">
          Use at least 8 characters.
        </p>
        <Suspense fallback={<ResetPasswordFormSkeleton />}>
          {searchParams.then((params) => (
            <ResetPasswordForm
              token={typeof params.token === 'string' ? params.token : ''}
            />
          ))}
        </Suspense>
      </section>
    </main>
  );
}
