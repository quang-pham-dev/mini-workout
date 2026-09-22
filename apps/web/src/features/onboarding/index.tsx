import { OnboardingComplete } from './components/onboarding-complete';
import { OnboardingForm } from './components/onboarding-form';
import { StartingLine } from './components/starting-line';
import { StepSchedule } from './components/step-schedule';
import { getInterests } from './queries';
import { MainLayout } from '@/components/layout/main-layout';
import { getCurrentSession, getUserProfile } from '@/lib/auth/session';
import {
  type OnboardingStep,
  isReadyForApp,
  normalizeStepParam,
} from '@/lib/onboarding/state-machine';
import { SearchParams } from '@/types/common';
import { redirect } from 'next/navigation';

type OnboardingContentProps = {
  searchParams: SearchParams;
};

export async function OnboardingContent({
  searchParams,
}: OnboardingContentProps) {
  const { error, mode, step } = await searchParams;

  const session = await getCurrentSession();

  if (!session?.user.id) {
    redirect('/login?callbackUrl=%2Fonboarding');
  }

  const [user, interests] = await Promise.all([
    getUserProfile(session.user.id),
    getInterests(),
  ]);

  const isEditMode = mode === 'edit';
  const requestedStep = normalizeStepParam(step);
  const activeStep: OnboardingStep =
    requestedStep ?? user?.currentStep ?? 'EXPERIENCE_LEVEL';

  if (
    user &&
    isReadyForApp(user.onboardingStatus) &&
    !isEditMode &&
    !requestedStep
  ) {
    redirect('/home');
  }

  const selectedInterestIds = (user?.interests ?? []).map(
    ({ interestId }) => interestId,
  );

  const showSchedule = activeStep === 'WEEKLY_SCHEDULE' && !isEditMode;

  if (activeStep === 'DONE' && user?.onboardingStatus === 'COMPLETED') {
    return (
      <MainLayout>
        <OnboardingComplete />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="grid max-w-6xl grid-cols-[minmax(15rem,0.75fr)_minmax(0,1.25fr)] gap-[clamp(2rem,7vw,7rem)] max-[760px]:grid-cols-1">
        <StartingLine />

        {showSchedule ? (
          <StepSchedule
            hasError={error === 'invalid'}
            initialWeeklyGoalDays={user?.weeklyGoalDays}
          />
        ) : (
          <OnboardingForm
            interests={interests}
            hasError={error === 'invalid'}
            initialExperienceLevel={user?.experienceLevel}
            initialInterestIds={selectedInterestIds}
            mode={isEditMode ? 'edit' : 'create'}
          />
        )}
      </div>
    </MainLayout>
  );
}
