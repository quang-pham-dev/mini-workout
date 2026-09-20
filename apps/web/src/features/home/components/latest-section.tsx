import { getWorkLatest } from '../queries';
import { WorkoutCard } from '@/components/workout-card';
import { WorkoutEngagementHydration } from '@/components/workout-engagement-hydration';

export async function LatestSection() {
  const { viewerId, workouts } = await getWorkLatest();

  return (
    <WorkoutEngagementHydration viewerId={viewerId} workouts={workouts}>
      <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[680px]:grid-cols-1">
        {workouts.map(
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
              from="home"
              transitionSource="home-latest"
            />
          ),
        )}
      </div>
    </WorkoutEngagementHydration>
  );
}
