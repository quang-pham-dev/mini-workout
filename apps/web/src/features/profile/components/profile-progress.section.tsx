import { OnboardingStatus } from '@/lib/onboarding';

type ProfileProgressSectionProps = {
  onboardingStatus: OnboardingStatus;
  weeklyGoalDays: number | null;
};

export function ProfileProgressSection({
  onboardingStatus,
  weeklyGoalDays,
}: ProfileProgressSectionProps) {
  return (
    <section
      className="rounded-[1.25rem] border border-border-subtle bg-surface p-6"
      aria-labelledby="profile-progress-title"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2
          className="text-[1.15rem] font-semibold tracking-[-0.02em]"
          id="profile-progress-title"
        >
          Profile Progress
        </h2>
        <span className="text-[0.85rem] font-semibold text-text-tertiary">
          {onboardingStatus === 'COMPLETED' ? '4/4' : '2/4'} steps
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-highlight"
          style={{
            width: onboardingStatus === 'COMPLETED' ? '100%' : '50%',
          }}
        />
      </div>
      <p className="mt-3 text-[0.85rem] text-text-secondary">
        {weeklyGoalDays
          ? `Weekly goal: ${weeklyGoalDays} movement days.`
          : 'Add your weekly schedule to improve recommendations.'}
      </p>
    </section>
  );
}
