import Link from 'next/link';

const landingCategories = [
  { name: 'Strength', detail: 'Build everyday power' },
  { name: 'Mobility', detail: 'Move with more ease' },
  { name: 'Mindful movement', detail: 'Find a quieter rhythm' },
];

export function LandingContent() {
  return (
    <main className="min-h-[100svh] overflow-hidden bg-background text-text-primary">
      <div className="mx-auto max-w-[82rem] px-[clamp(1.25rem,5vw,5rem)] py-6 sm:py-8">
        <header className="flex items-center justify-between gap-6">
          <Link
            className="font-display text-[1.15rem] font-extrabold tracking-[-0.04em] text-text-primary no-underline"
            href="/"
          >
            mini / workout
          </Link>
          <nav
            className="flex items-center gap-3"
            aria-label="Public navigation"
          >
            <Link
              className="rounded-full px-4 py-2 text-sm font-semibold text-text-secondary no-underline transition hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              href="/login"
            >
              Log in
            </Link>
            <Link
              className="rounded-full bg-highlight px-4 py-2 text-sm font-bold text-highlight-foreground no-underline transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              href="/register"
            >
              Start free
            </Link>
          </nav>
        </header>

        <section className="grid min-h-[min(48rem,calc(100svh-6rem))] items-center gap-12 py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)] lg:py-24">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-highlight">
              A kinder way to get moving
            </p>
            <h1 className="max-w-4xl text-balance font-display text-[clamp(3.5rem,9vw,8.5rem)] font-bold leading-[0.88] tracking-[-0.08em]">
              Make room for the way you want to feel.
            </h1>
            <p className="mt-8 max-w-xl text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.65] text-text-secondary">
              Short, thoughtful workouts for real days. Tell us what you want
              more of and we&apos;ll help you find a rhythm that can last.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                className="rounded-full bg-highlight px-6 py-3 text-base font-bold text-highlight-foreground no-underline shadow-[0_1rem_2.5rem_color-mix(in_oklch,var(--color-highlight)_22%,transparent)] transition hover:-translate-y-0.5 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4 motion-reduce:transition-none"
                href="/register"
              >
                Build my starting plan
              </Link>
              <Link
                className="rounded-full border border-border-default px-6 py-3 text-base font-semibold text-text-primary no-underline transition hover:border-border-strong hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"
                href="/login"
              >
                I already have an account
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[28rem] lg:justify-self-end">
            <div
              className="absolute -inset-8 rounded-[3rem] bg-highlight-soft blur-3xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-border-subtle bg-surface p-6 shadow-[0_2rem_5rem_oklch(0.2_0.02_250/0.12)]">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-text-tertiary">
                <span>This week</span>
                <span className="text-highlight-foreground">3 small wins</span>
              </div>
              <div className="mt-8 space-y-3">
                {[
                  'Move with intention',
                  'Find your steady',
                  'Leave feeling better',
                ].map((label, index) => (
                  <div
                    className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface-raised p-4"
                    key={label}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-highlight-soft font-display font-bold text-highlight-foreground">
                      0{index + 1}
                    </span>
                    <span>
                      <span className="block font-bold tracking-[-0.02em]">
                        {label}
                      </span>
                      <span className="mt-1 block text-sm text-text-tertiary">
                        {index === 0
                          ? 'Start where you are'
                          : 'A little counts'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-8 mb-0 border-t border-border-subtle pt-5 text-sm leading-6 text-text-secondary">
                No perfect streaks required. Just a place to begin.
              </p>
            </div>
          </div>
        </section>

        <section
          className="border-t border-border-subtle py-14"
          aria-labelledby="landing-categories-title"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-highlight">
                Choose your energy
              </p>
              <h2
                className="m-0 font-display text-3xl tracking-[-0.05em]"
                id="landing-categories-title"
              >
                A few good places to start
              </h2>
            </div>
            <p className="m-0 max-w-sm text-sm leading-6 text-text-secondary">
              Your plan gets more personal after a quick two-minute check-in.
            </p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {landingCategories.map((category, index) => (
              <Link
                className="group rounded-2xl border border-border-subtle bg-surface-raised p-5 no-underline transition-[border-color,background-color,transform] duration-[160ms] hover:-translate-y-0.5 hover:border-highlight hover:bg-highlight-soft focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none"
                href="/register"
                key={category.name}
              >
                <span className="text-xs font-bold text-text-tertiary">
                  0{index + 1}
                </span>
                <span className="mt-8 block text-lg font-bold tracking-[-0.025em] text-text-primary">
                  {category.name}
                </span>
                <span className="mt-2 block text-sm text-text-secondary">
                  {category.detail}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle py-8 text-sm text-text-tertiary">
          <span>Small steps. Real movement.</span>
          <Link
            className="font-semibold text-text-secondary no-underline hover:text-text-primary"
            href="/register"
          >
            Start your plan →
          </Link>
        </footer>
      </div>
    </main>
  );
}
