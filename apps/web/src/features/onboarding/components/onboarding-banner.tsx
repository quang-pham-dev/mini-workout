'use client';

import { STORAGE_KEY } from '../constants';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function OnboardingProgressBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  if (dismissed) return null;

  return (
    <section
      className="mt-8 rounded-3xl border border-highlight/30 bg-highlight-soft p-5 text-highlight-foreground shadow-[0_1rem_3rem_oklch(0.2_0.02_250/0.06)]"
      aria-labelledby="onboarding-progress-title"
    >
      <div className="flex items-start justify-between gap-4 max-[640px]:flex-col">
        <div className="min-w-0 flex-1">
          <p
            className="mb-2 text-sm font-bold tracking-[-0.01em]"
            id="onboarding-progress-title"
          >
            Movement profile: 2/4 steps complete
          </p>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full w-1/2 rounded-full bg-highlight" />
          </div>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            Add your weekly schedule so Mini Workout can tune reminders and make
            your recommendations more precise.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 max-[480px]:w-full max-[480px]:flex-col">
          <Link
            className="rounded-full bg-highlight px-4 py-2 text-sm font-bold text-highlight-foreground no-underline transition hover:brightness-95 max-[480px]:w-full max-[480px]:text-center"
            href="/onboarding?step=WEEKLY_SCHEDULE"
          >
            Finish now (1 min)
          </Link>
          <button
            className="text-sm font-semibold text-text-tertiary underline-offset-4 hover:text-text-primary hover:underline"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, 'true');
              setDismissed(true);
            }}
            type="button"
          >
            Later
          </button>
        </div>
      </div>
    </section>
  );
}
