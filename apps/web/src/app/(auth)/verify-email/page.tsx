import {
  ResendVerificationForm,
  VerificationNotice,
  VerificationNoticeSkeleton,
} from '@/features/auth/recovery';
import type { SearchParams } from '@/types/common';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'Verify email' };

async function VerificationNoticeContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  return <VerificationNotice hasError={typeof params.error === 'string'} />;
}

export default function VerifyEmailPage({
  searchParams,
}: PageProps<'/verify-email'>) {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-background px-4 py-8">
      <section
        className="w-[min(100%,28rem)] rounded-2xl border border-border-default bg-surface p-8"
        aria-labelledby="verify-email-title"
      >
        <h1 className="m-0 text-center text-[1.75rem]" id="verify-email-title">
          Check your email
        </h1>
        <p className="mb-6 mt-2 text-center text-text-secondary">
          Open the verification link to activate your account.
        </p>
        <Suspense fallback={<VerificationNoticeSkeleton />}>
          <VerificationNoticeContent searchParams={searchParams} />
        </Suspense>
        <ResendVerificationForm />
      </section>
    </main>
  );
}
