import { auth } from '../../../auth';
import { OnboardingForm } from '../../../features/onboarding/onboarding-form';
import { prisma } from '../../../lib/db/prisma';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Build your starting plan | Mini Workout',
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user.id) {
    redirect('/login?callbackUrl=%2Fonboarding');
  }

  const [user, interests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompleted: true },
    }),
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
