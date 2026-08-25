import { LoginContent } from './login-content';
import { AuthCardSkeleton } from '@/components/skeletons/auth-card-skeleton';
import { Suspense } from 'react';

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
