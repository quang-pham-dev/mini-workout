import { WorkoutCard } from '@/components/workout-card';
import { WorkoutType } from '@/types/workout';

type FavouritesSectionProps = {
  viewerId: string;
  savedWorkouts: WorkoutType[];
};

export function FavouritesSection({
  viewerId,
  savedWorkouts,
}: FavouritesSectionProps) {
  return (
    <section className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
      {savedWorkouts.map(
        ({
          id,
          title,
          slug,
          description,
          durationMinutes,
          level,
          thumbnailUrl,
          coach,
          category,
          _count,
          likes,
          favorites,
        }: WorkoutType) => (
          <WorkoutCard
            key={id}
            viewerId={viewerId}
            id={id}
            title={title}
            slug={slug}
            description={description}
            durationMinutes={durationMinutes}
            level={level}
            thumbnailUrl={thumbnailUrl}
            coach={{
              name: coach.name,
              bio: coach.bio,
            }}
            category={{
              name: category.name,
            }}
            _count={{
              likes: _count.likes,
            }}
            likes={likes}
            favorites={favorites}
            from="favourites"
            transitionSource="favourites"
          />
        ),
      )}
    </section>
  );
}
