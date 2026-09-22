import Link from 'next/link';

export function OnboardingComplete() {
  return (
    <section
      className="max-w-2xl rounded-3xl border border-highlight/30 bg-highlight-soft p-[clamp(1.5rem,5vw,3.5rem)] shadow-[0_1.5rem_4rem_oklch(0.2_0.02_250/0.08)]"
      aria-labelledby="onboarding-complete-title"
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-highlight-foreground">
        Your starting line is ready
      </p>
      <div
        className="my-6 grid size-16 place-items-center rounded-full bg-highlight text-2xl font-bold text-highlight-foreground"
        aria-hidden="true"
      >
        ✓
      </div>
      <h1
        className="m-0 font-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.92] tracking-[-0.07em]"
        id="onboarding-complete-title"
      >
        You&apos;re ready to move.
      </h1>
      <p className="mt-6 max-w-xl text-[1.05rem] leading-[1.65] text-text-secondary">
        We&apos;ll use your focus and weekly rhythm to shape recommendations
        that feel useful from the very first session. You can change your
        preferences any time from your profile.
      </p>
      <Link
        className="mt-8 inline-flex rounded-full bg-highlight px-6 py-3 font-bold text-highlight-foreground no-underline transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"
        href="/home"
      >
        See my first week →
      </Link>
    </section>
  );
}
