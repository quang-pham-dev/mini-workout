import { AnimatedSuspense } from '@/components/animated-suspense';
import { AuthCardSkeleton } from '@/components/skeletons/auth-card-skeleton';
import { LoginContent } from '@/features/auth/login';
import { SearchParams } from '@/types/common';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
};

type LoginPageProps = {
  searchParams: SearchParams;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <AnimatedSuspense fallback={<AuthCardSkeleton />}>
      <LoginContent searchParams={searchParams} />
    </AnimatedSuspense>
  );
}
