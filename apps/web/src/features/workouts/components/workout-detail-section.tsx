import { WorkoutActions } from '@/components/workout-card/workout-actions';
import { formatDuration } from '@/lib/utils/format';

type WorkoutDetailSectionProps = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  level: string;
  likeCount: number;
  coach: { name: string; bio: string };
  category: { name: string };
  likes: { userId: string }[];
  favorites: { userId: string }[];
};

export function WorkoutDetailSection({
  id,
  title,
  description,
  durationMinutes,
  level,
  coach,
  likeCount,
  category,
  likes,
  favorites,
}: WorkoutDetailSectionProps) {
  return (
    <section className="max-w-3xl py-[clamp(2rem,6vw,5rem)]">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-highlight">
        {category.name}
      </p>
      <h1 className="text-balance font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.065em]">
        {title}
      </h1>
      <p className="mt-6 text-[1.1rem] leading-[1.65] text-text-secondary">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap gap-[0.65rem] text-[0.85rem] text-text-secondary [&_span]:rounded-full [&_span]:bg-highlight-soft [&_span]:px-[0.7rem] [&_span]:py-[0.45rem] [&_span]:text-highlight-foreground">
        <span>{formatDuration(durationMinutes)}</span>
        <span>{level.toLowerCase()}</span>
        <span>with {coach.name}</span>
      </div>
      <WorkoutActions
        workoutId={id}
        likeCount={likeCount}
        liked={likes.length > 0}
        favorited={favorites.length > 0}
      />
      <div className="mt-12 border-t border-border-subtle pt-6">
        <strong>Meet {coach.name}</strong>
        <p className="mt-2 text-text-secondary">{coach.bio}</p>
      </div>
    </section>
  );
}
