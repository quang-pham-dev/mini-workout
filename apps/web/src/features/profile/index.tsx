import { ProfileActivitySection } from './components/profile-activity-section';
import { ProfileAppearanceSection } from './components/profile-appearance-section';
import { ProfileFooterSection } from './components/profile-footer-section';
import { ProfileHeaderSection } from './components/profile-header-section';
import { ProfileMovementFocusSection } from './components/profile-movement-focus-section';
import { ProfileProgressSection } from './components/profile-progress.section';
import { getUserProfile } from './queries';
import { isReadyForApp } from '@/lib/onboarding/state-machine';
import { redirect } from 'next/navigation';

export async function ProfileContent() {
  const userProfile = await getUserProfile();
  const {
    name,
    email,
    createdAt,
    onboardingStatus,
    currentStep,
    experienceLevel,
    interests,
    _count,
    weeklyGoalDays,
  } = userProfile || {};
  const { likes, favorites } = _count || {};

  if (!userProfile) {
    redirect('/login');
  }

  if (!isReadyForApp(onboardingStatus)) {
    redirect(`/onboarding?step=${currentStep}`);
  }

  return (
    <>
      <ProfileHeaderSection
        name={name || ''}
        email={email || ''}
        createdAt={createdAt || new Date()}
      />
      <div className="flex flex-col gap-6">
        <ProfileActivitySection
          favoriteCount={favorites || 0}
          likeCount={likes || 0}
        />
        <ProfileMovementFocusSection
          experienceLevel={experienceLevel || ''}
          interests={interests?.map((ui) => ui.interest) || []}
        />
        <ProfileProgressSection
          onboardingStatus={onboardingStatus || ''}
          weeklyGoalDays={weeklyGoalDays || 0}
        />
        <ProfileAppearanceSection />
        <ProfileFooterSection email={email || ''} />
      </div>
    </>
  );
}
