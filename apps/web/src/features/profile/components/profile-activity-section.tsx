type ProfileActivitySectionProps = {
  favoriteCount: number;
  likeCount: number;
};

export async function ProfileActivitySection({
  favoriteCount,
  likeCount,
}: ProfileActivitySectionProps) {
  return (
    <section
      className="rounded-[1.25rem] border border-border-subtle bg-surface p-6"
      aria-labelledby="activity-title"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2
          className="text-[1.15rem] font-semibold tracking-[-0.02em]"
          id="activity-title"
        >
          Your Activity
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1 rounded-[0.875rem] bg-surface-sunken p-5">
          <span className="font-display text-[1.85rem] font-bold tracking-[-0.03em]">
            {favoriteCount}
          </span>
          <span className="text-[0.825rem] text-text-secondary">
            Saved Sessions
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-[0.875rem] bg-surface-sunken p-5">
          <span className="font-display text-[1.85rem] font-bold tracking-[-0.03em]">
            {likeCount}
          </span>
          <span className="text-[0.825rem] text-text-secondary">
            Liked Workouts
          </span>
        </div>
      </div>
    </section>
  );
}
