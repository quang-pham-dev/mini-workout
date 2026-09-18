import { AnimatedSuspense } from '@/components/animated-suspense';
import { getCurrentSession, getUserProfile } from '@/lib/auth/session';
import {
  getRedirectStepParam,
  isReadyForApp,
} from '@/lib/onboarding/state-machine';
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
