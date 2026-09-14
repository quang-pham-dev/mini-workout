import { AnimatedSuspense } from '@/components/animated-suspense';
import { AuthCardSkeleton } from '@/components/skeletons/auth-card-skeleton';
import { RegisterContent } from '@/features/auth/register';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register',
};

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  return (
    <AnimatedSuspense fallback={<AuthCardSkeleton fieldsCount={4} />}>
      <RegisterContent searchParams={searchParams} />
    </AnimatedSuspense>
  );
}
