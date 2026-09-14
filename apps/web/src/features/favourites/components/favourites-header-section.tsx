type HeaderSectionProps = {
  savedWorkoutsCount: number;
};

export function FavouritesHeaderSection({
  savedWorkoutsCount,
}: HeaderSectionProps) {
  return (
    <header className="mb-10">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-highlight">
        Your Library
      </p>
      <h1 className="mb-3 font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.05em]">
        Saved Sessions
        {savedWorkoutsCount > 0 && (
          <span className="ml-3 inline-flex items-center rounded-full bg-surface-sunken px-[0.65rem] py-[0.2rem] align-middle text-[0.85rem] font-semibold text-text-secondary">
            {savedWorkoutsCount}
          </span>
        )}
      </h1>
      <p className="max-w-lg text-base leading-[1.6] text-text-secondary">
        Workouts you have saved for quick access. Revisit your favorite flows
        anytime.
      </p>
    </header>
  );
}
