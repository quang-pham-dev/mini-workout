import { OnboardingForm } from '@/features/onboarding/onboarding-form';
import { getCurrentSession, getUserProfile } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';

export async function OnboardingContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentSession();

  if (!session?.user.id) {
    redirect('/login?callbackUrl=%2Fonboarding');
  }

  const [user, interests] = await Promise.all([
    getUserProfile(session.user.id),
    prisma.interest.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  if (user?.onboardingCompleted) {
    redirect('/home');
  }

  const { error } = await searchParams;

  return (
    <OnboardingForm interests={interests} hasError={error === 'invalid'} />
  );
}
