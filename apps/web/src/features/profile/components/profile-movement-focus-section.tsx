import Link from 'next/link';

type ProfileMovementFocusSectionProps = {
  experienceLevel: string;
  interests: {
    name: string;
    id: string;
    createdAt: Date;
    slug: string;
  }[];
};

export function ProfileMovementFocusSection({
  experienceLevel,
  interests,
}: ProfileMovementFocusSectionProps) {
  return (
    <section
      className="rounded-[1.25rem] border border-border-subtle bg-surface p-6"
      aria-labelledby="preferences-title"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2
          className="text-[1.15rem] font-semibold tracking-[-0.02em]"
          id="preferences-title"
        >
          Movement Focus
        </h2>
        <Link
          className="text-[0.85rem] font-semibold text-highlight-foreground no-underline hover:underline"
          href="/onboarding?mode=edit"
        >
          Edit
        </Link>
      </div>

      <div className="flex items-center justify-between py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-subtle">
        <span className="text-[0.9rem] text-text-secondary">
          Experience Level
        </span>
        <span className="inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--color-highlight)_15%,transparent)] px-[0.85rem] py-[0.35rem] text-[0.825rem] font-bold capitalize text-highlight-foreground">
          {experienceLevel?.toLowerCase() || 'beginner'}
        </span>
      </div>

      <div className="flex items-center justify-between py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-subtle">
        <span className="text-[0.9rem] text-text-secondary">
          Selected Interests
        </span>
        <div className="flex flex-wrap gap-2">
          {interests.length > 0 ? (
            interests.map(({ id, name }: { id: string; name: string }) => (
              <span
                key={id}
                className="inline-flex items-center rounded-full border border-border-subtle bg-surface-sunken px-[0.85rem] py-[0.35rem] text-[0.825rem] font-medium"
              >
                {name}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center rounded-full border border-border-subtle bg-surface-sunken px-[0.85rem] py-[0.35rem] text-[0.825rem] font-medium">
              None selected
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
