import Link from 'next/link';

export function EmptyState() {
  return (
    <section className="flex flex-col items-center rounded-[1.25rem] border border-dashed border-border-default bg-surface px-6 py-16 text-center">
      <div className="mb-4 text-[2.5rem] text-text-tertiary" aria-hidden="true">
        ★
      </div>
      <h2 className="mb-2 text-xl font-semibold tracking-[-0.02em]">
        No saved workouts yet
      </h2>
      <p className="mb-6 max-w-96 text-[0.9rem] leading-[1.5] text-text-secondary">
        When you find a session you love or want to try later, click the Star
        icon to keep it here.
      </p>
      <Link
        className="inline-flex items-center justify-center rounded-full bg-text-primary px-5 py-[0.65rem] text-sm font-semibold text-background no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        href="/home"
      >
        Explore Workouts
      </Link>
    </section>
  );
}
