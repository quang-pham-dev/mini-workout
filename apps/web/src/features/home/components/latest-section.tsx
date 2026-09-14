import { getWorkLatest } from '../queries';
import { WorkoutCard } from '@/components/workout-card';

export async function LatestSection() {
  const latest = await getWorkLatest();

  return (
    <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[680px]:grid-cols-1">
      {latest?.map(
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
        }) => (
          <WorkoutCard
            key={id}
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
          />
        ),
      )}
    </div>
  );
}
