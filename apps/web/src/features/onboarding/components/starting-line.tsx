export function StartingLine() {
  return (
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
        Tell us what you want more of. We’ll use it to shape a first week that
        fits your energy, not someone else’s routine.
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
  );
}
