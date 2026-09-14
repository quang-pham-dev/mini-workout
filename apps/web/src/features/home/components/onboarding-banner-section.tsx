import { OnboardingProgressBanner } from '@/features/onboarding/components/onboarding-banner';
import { requireOnboardedUser } from '@/lib/auth/session';

export async function OnboardingBannerSection() {
  const { profile } = await requireOnboardedUser();

  if (profile.onboardingStatus !== 'REQUIRED_COMPLETED') {
    return null;
  }

  return <OnboardingProgressBanner />;
}
