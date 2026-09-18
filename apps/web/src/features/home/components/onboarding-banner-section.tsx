import { OnboardingProgressBanner } from './onboarding-progress-banner';
import { requireOnboardedUser } from '@/lib/auth/session';

export async function OnboardingBannerSection() {
  const { profile } = await requireOnboardedUser();

  if (profile.onboardingStatus !== 'REQUIRED_COMPLETED') {
    return null;
  }

  return <OnboardingProgressBanner />;
}
