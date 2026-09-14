import { AnimatedSuspense } from '@/components/animated-suspense';
import {
  getRedirectStepParam,
  isReadyForApp,
} from '@/features/onboarding/state-machine';
import { getCurrentSession, getUserProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

async function RootRedirect(): Promise<null> {
  const session = await getCurrentSession();

  if (session?.user?.id) {
    const profile = await getUserProfile(session.user.id);
    if (isReadyForApp(profile?.onboardingStatus)) {
      redirect('/home');
    }
    redirect(`/onboarding?step=${getRedirectStepParam(profile?.currentStep)}`);
  }

  redirect('/login');
}

export default function RootPage() {
  return (
    <AnimatedSuspense fallback={null}>
      <RootRedirect />
    </AnimatedSuspense>
  );
}
