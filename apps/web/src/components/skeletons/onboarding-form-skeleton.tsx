import React from 'react';

const SHIMMER_BASE =
  'animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none dark:bg-[linear-gradient(90deg,rgb(255_255_255/6%)_25%,rgb(255_255_255/12%)_37%,rgb(255_255_255/6%)_63%)]';

export function OnboardingFormSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading onboarding"
      className="min-h-[100svh] bg-background px-[clamp(1rem,5vw,5rem)] py-[clamp(2rem,7vw,6rem)] text-text-primary"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(15rem,0.75fr)_minmax(0,1.25fr)] gap-[clamp(2rem,7vw,7rem)] max-[760px]:grid-cols-1">
        {/* Left Column: Hero / Sidebar */}
        <section
          aria-hidden="true"
          className="sticky top-12 self-start max-[760px]:static"
        >
          {/* Eyebrow */}
          <div className={`${SHIMMER_BASE} h-3.5 w-32`} />

          {/* Accent decoration */}
          <div
            className="my-5 mb-6 h-[0.6rem] w-[4.5rem] -rotate-3 rounded-full bg-highlight/30"
            aria-hidden="true"
          />

          {/* Headline (multi-line) */}
          <div className="max-w-[25rem] space-y-2.5">
            <div className={`${SHIMMER_BASE} h-10 w-full md:h-12`} />
            <div className={`${SHIMMER_BASE} h-10 w-4/5 md:h-12`} />
          </div>

          {/* Subtitle paragraph */}
          <div className="mt-6 max-w-[27rem] space-y-2">
            <div className={`${SHIMMER_BASE} h-4 w-full`} />
            <div className={`${SHIMMER_BASE} h-4 w-[90%]`} />
            <div className={`${SHIMMER_BASE} h-4 w-[60%]`} />
          </div>

          {/* Stepper indicator */}
          <div
            className="mt-12 flex items-center gap-[0.65rem] max-[760px]:mt-8"
            aria-hidden="true"
          >
            <div className={`${SHIMMER_BASE} h-3.5 w-5`} />
            <span className="h-px w-10 bg-border-default" />
            <div className={`${SHIMMER_BASE} h-3.5 w-5`} />
            <div className={`${SHIMMER_BASE} ml-2 h-3.5 w-24`} />
          </div>
        </section>

        {/* Right Column: Form Card */}
        <section
          aria-hidden="true"
          className="rounded-3xl border border-border-subtle bg-surface p-[clamp(1.25rem,4vw,3rem)] shadow-[0_1.5rem_4rem_oklch(0.2_0.02_250/0.08)]"
        >
          {/* Section 1: Interests */}
          <div>
            {/* Legend / Title */}
            <div className={`${SHIMMER_BASE} h-7 w-64`} />
            {/* Subtitle */}
            <div className={`${SHIMMER_BASE} mt-2 mb-5 h-4 w-44`} />

            {/* Interest Cards Grid */}
            <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  className="flex min-h-[4.5rem] items-center rounded-[0.9rem] border border-border-default bg-surface-raised p-4"
                  key={index}
                >
                  <div className="grid flex-1 gap-[0.35rem]">
                    <div className={`${SHIMMER_BASE} h-4 w-24`} />
                    <div className={`${SHIMMER_BASE} h-3 w-36`} />
                  </div>
                  <div
                    className={`${SHIMMER_BASE} ml-auto size-[1.35rem] rounded-[0.35rem] border border-border-default`}
                  />
                </div>
              ))}
            </div>

            {/* Helper text */}
            <div className={`${SHIMMER_BASE} mt-3 h-3.5 w-36`} />
          </div>

          {/* Section 2: Experience Levels */}
          <div className="mt-10 border-t border-border-subtle pt-10">
            {/* Legend / Title */}
            <div className={`${SHIMMER_BASE} h-7 w-40`} />
            {/* Subtitle */}
            <div className={`${SHIMMER_BASE} mt-2 mb-5 h-4 w-52`} />

            {/* Level Cards Stack */}
            <div className="grid gap-[0.65rem]">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="flex min-h-[3.75rem] items-center rounded-[0.9rem] border border-border-default bg-surface-raised p-4"
                  key={index}
                >
                  {/* Radio circle */}
                  <div
                    className={`${SHIMMER_BASE} mr-[0.85rem] size-[1.15rem] rounded-full`}
                  />
                  <div className="grid flex-1 gap-[0.35rem]">
                    <div className={`${SHIMMER_BASE} h-4 w-28`} />
                    <div className={`${SHIMMER_BASE} h-3 w-48`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-border-subtle pt-6 max-[480px]:flex-col max-[480px]:items-stretch">
            <div className={`${SHIMMER_BASE} h-4 w-48 max-[480px]:w-36`} />
            {/* Button */}
            <div className="animate-shimmer h-11 w-48 shrink-0 rounded-lg bg-primary/20 bg-[linear-gradient(90deg,transparent_25%,rgb(255_255_255/25%)_37%,transparent_63%)] bg-[length:400%_100%] motion-reduce:animate-none max-[480px]:w-full" />
          </div>
        </section>
      </div>
    </main>
  );
}
