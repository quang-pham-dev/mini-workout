import { RegisterContent } from './register-content';
import { AuthCardSkeleton } from '@/components/skeletons/auth-card-skeleton';
import { Suspense } from 'react';

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <RegisterContent searchParams={searchParams} />
    </Suspense>
  );
}
