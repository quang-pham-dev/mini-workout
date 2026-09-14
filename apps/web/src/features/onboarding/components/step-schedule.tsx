import { saveWeeklyScheduleStep, skipOptionalStep } from '../actions';
import { SubmitButton } from './submit-button';

type StepScheduleProps = {
  hasError: boolean;
  initialWeeklyGoalDays?: number | null;
};

export function StepSchedule({
  hasError,
  initialWeeklyGoalDays,
}: StepScheduleProps) {
  return (
    <div className="rounded-3xl border border-border-subtle bg-surface p-[clamp(1.25rem,4vw,3rem)] shadow-[0_1.5rem_4rem_oklch(0.2_0.02_250/0.08)]">
      <form action={saveWeeklyScheduleStep}>
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="p-0 text-[1.35rem] font-bold tracking-[-0.025em]">
            How often do you want to move?
          </legend>
          <p className="my-[0.35rem] mb-5 text-[0.9rem] text-text-tertiary">
            Pick a weekly target so Mini Workout can tune your suggestions.
          </p>
          <div className="grid grid-cols-7 gap-2 max-[640px]:grid-cols-4">
            {Array.from({ length: 7 }, (_, index) => index + 1).map((day) => (
              <label
                className="grid cursor-pointer place-items-center rounded-[0.9rem] border border-border-default bg-surface-raised p-4 text-center font-bold transition hover:border-border-strong has-[:checked]:border-highlight has-[:checked]:bg-highlight-soft"
                key={day}
              >
                <input
                  className="sr-only"
                  defaultChecked={initialWeeklyGoalDays === day}
                  name="weeklyGoalDays"
                  type="radio"
                  value={day}
                />
                <span>{day}</span>
                <span className="text-[0.7rem] font-medium text-text-tertiary">
                  {day === 1 ? 'day' : 'days'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {hasError && (
          <p
            className="mt-6 border-l-[3px] border-error-500 bg-error-50 px-4 py-[0.8rem] text-[0.9rem] text-error-800"
            role="alert"
          >
            Choose a weekly target from 1 to 7 days.
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-border-subtle pt-6 max-[480px]:flex-col max-[480px]:items-stretch">
          <p className="m-0 my-[0.35rem] text-[0.9rem] text-text-tertiary">
            You can update this from onboarding later.
          </p>
          <SubmitButton label="Save schedule" />
        </div>
      </form>

      <form
        action={skipOptionalStep}
        className="mt-3 text-right max-[480px]:text-center"
      >
        <input name="step" type="hidden" value="WEEKLY_SCHEDULE" />
        <button
          className="text-[0.85rem] font-semibold text-text-tertiary underline-offset-4 hover:text-text-primary hover:underline"
          type="submit"
        >
          Skip this step
        </button>
      </form>
    </div>
  );
}
