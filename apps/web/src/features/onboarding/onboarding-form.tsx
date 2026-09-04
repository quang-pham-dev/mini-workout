'use client';

import { completeOnboarding } from './actions';
import { Button, cn } from '@mini-workout/ui';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';

type Interest = { id: string; name: string; slug: string };

const interestDescriptions: Record<string, string> = {
  cardio: 'Build your engine',
  flexibility: 'Make space to move',
  hiit: 'Short, focused effort',
  meditation: 'Find a quieter rhythm',
  mobility: 'Move with more ease',
  pilates: 'Strengthen with control',
  strength: 'Build everyday power',
  stretching: 'Unwind and reset',
  yoga: 'Breathe and flow',
};

const experienceLevels = [
  { value: 'BEGINNER', label: 'New to regular movement', title: 'Beginner' },
  {
    value: 'INTERMEDIATE',
    label: 'Building a steady rhythm',
    title: 'Intermediate',
  },
  { value: 'ADVANCED', label: 'Ready for a challenge', title: 'Advanced' },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="shrink-0 [text-transform:none] max-[480px]:w-full"
      type="submit"
      disabled={pending}
    >
      {pending ? 'Saving…' : 'Create my starting plan'}
    </Button>
  );
}

export function OnboardingForm({
  interests,
  hasError,
}: {
  interests: Interest[];
  hasError: boolean;
}) {
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(
    new Set(),
  );
  const [experienceLevel, setExperienceLevel] = useState('');

  function toggleInterest(id: string) {
    setSelectedInterests((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="min-h-[100svh] bg-background px-[clamp(1rem,5vw,5rem)] py-[clamp(2rem,7vw,6rem)] text-text-primary">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(15rem,0.75fr)_minmax(0,1.25fr)] gap-[clamp(2rem,7vw,7rem)] max-[760px]:grid-cols-1">
        <section
          className="sticky top-12 self-start max-[760px]:static"
          aria-labelledby="onboarding-title"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-highlight">
            Your starting line
          </p>
          <div
            className="my-5 mb-6 h-[0.6rem] w-[4.5rem] -rotate-3 rounded-full bg-highlight"
            aria-hidden="true"
          />
          <h1
            className="m-0 max-w-[25rem] text-balance font-display text-[clamp(2.4rem,5vw,4.4rem)] font-bold leading-[0.98] tracking-[-0.055em]"
            id="onboarding-title"
          >
            A plan that feels like yours.
          </h1>
          <p className="mt-6 max-w-[27rem] text-[1.05rem] leading-[1.65] text-text-secondary">
            Tell us what you want more of. We’ll use it to shape a first week
            that fits your energy, not someone else’s routine.
          </p>
          <div
            className="mt-12 flex items-center gap-[0.65rem] text-xs font-bold tracking-[0.08em] text-text-tertiary max-[760px]:mt-8"
            aria-label="Onboarding progress"
          >
            <span className="text-highlight-foreground">01</span>
            <span className="h-px w-10 bg-border-default" />
            <span>02</span>
            <span className="ml-[0.4rem] font-medium tracking-normal text-text-tertiary">
              Preferences next
            </span>
          </div>
        </section>

        <form
          action={completeOnboarding}
          className="rounded-3xl border border-border-subtle bg-surface p-[clamp(1.25rem,4vw,3rem)] shadow-[0_1.5rem_4rem_oklch(0.2_0.02_250/0.08)]"
        >
          <fieldset className="min-w-0 border-0 p-0 [&+&]:mt-10 [&+&]:border-t [&+&]:border-border-subtle [&+&]:pt-10">
            <legend className="p-0 text-[1.35rem] font-bold tracking-[-0.025em]">
              What do you want more of?
            </legend>
            <p className="my-[0.35rem] mb-5 text-[0.9rem] text-text-tertiary">
              Choose at least one focus.
            </p>
            <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
              {interests.map((interest) => {
                const selected = selectedInterests.has(interest.id);
                return (
                  <label
                    className={cn(
                      'relative flex min-h-[4.5rem] cursor-pointer items-center rounded-[0.9rem] border border-border-default bg-surface-raised p-4 transition-[border-color,background-color,box-shadow,transform] duration-[160ms] hover:-translate-y-px hover:border-border-strong focus-within:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-within:outline-offset-2 motion-reduce:transition-none',
                      selected &&
                        '!border-highlight bg-highlight-soft shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-highlight)_22%,transparent)]',
                    )}
                    key={interest.id}
                  >
                    <input
                      checked={selected}
                      className="absolute h-px w-px opacity-0"
                      name="interests"
                      onChange={() => toggleInterest(interest.id)}
                      type="checkbox"
                      value={interest.id}
                    />
                    <span className="grid gap-[0.2rem]">
                      <span className="font-bold">{interest.name}</span>
                      <span className="text-[0.8rem] text-text-tertiary">
                        {interestDescriptions[interest.slug] ??
                          'Make it part of your week'}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'ml-auto grid size-[1.35rem] place-items-center rounded-[0.35rem] border border-border-default text-[0.8rem] text-transparent',
                        selected &&
                          'border-highlight bg-highlight text-highlight-foreground',
                      )}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  </label>
                );
              })}
            </div>
            <p
              className="mt-3 min-h-5 text-[0.8rem] text-text-tertiary"
              aria-live="polite"
            >
              {selectedInterests.size === 0
                ? 'Nothing selected yet'
                : `${selectedInterests.size} focus${selectedInterests.size === 1 ? '' : 'es'} selected`}
            </p>
          </fieldset>

          <fieldset className="min-w-0 border-0 p-0 [&+&]:mt-10 [&+&]:border-t [&+&]:border-border-subtle [&+&]:pt-10">
            <legend className="p-0 text-[1.35rem] font-bold tracking-[-0.025em]">
              Set your pace
            </legend>
            <p className="my-[0.35rem] mb-5 text-[0.9rem] text-text-tertiary">
              There is no wrong starting point.
            </p>
            <div className="grid gap-[0.65rem]">
              {experienceLevels.map((level) => {
                const selected = experienceLevel === level.value;
                return (
                  <label
                    className={cn(
                      'relative flex min-h-[3.75rem] cursor-pointer items-center rounded-[0.9rem] border border-border-default bg-surface-raised p-4 transition-[border-color,background-color,box-shadow,transform] duration-[160ms] hover:-translate-y-px hover:border-border-strong focus-within:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-within:outline-offset-2 motion-reduce:transition-none',
                      selected &&
                        '!border-highlight bg-highlight-soft shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-highlight)_22%,transparent)]',
                    )}
                    key={level.value}
                  >
                    <input
                      checked={selected}
                      className="absolute h-px w-px opacity-0"
                      name="experienceLevel"
                      onChange={() => setExperienceLevel(level.value)}
                      type="radio"
                      value={level.value}
                    />
                    <span
                      className={cn(
                        'mr-[0.85rem] size-[1.15rem] rounded-full border border-border-strong',
                        selected &&
                          'border-[0.35rem] border-solid border-highlight',
                      )}
                      aria-hidden="true"
                    />
                    <span className="grid gap-[0.2rem]">
                      <span className="font-bold">{level.title}</span>
                      <span className="text-[0.8rem] text-text-tertiary">
                        {level.label}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {hasError && (
            <p
              className="mt-6 border-l-[3px] border-error-500 bg-error-50 px-4 py-[0.8rem] text-[0.9rem] text-error-800"
              role="alert"
              aria-live="polite"
            >
              Choose at least one focus and a pace to continue.
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-border-subtle pt-6 max-[480px]:flex-col max-[480px]:items-stretch">
            <p className="m-0 my-[0.35rem] text-[0.9rem] text-text-tertiary">
              You can change these anytime.
            </p>
            <SubmitButton />
          </div>
        </form>
      </div>
    </main>
  );
}
