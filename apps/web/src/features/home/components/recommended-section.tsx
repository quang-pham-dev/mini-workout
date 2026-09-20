import { buildRecommendations } from '../lib/build-recommendations';
import { EmptyRecommendations } from './empty-recommendations';
import { WorkoutCard } from '@/components/workout-card';
import { requireOnboardedUser } from '@/lib/auth/session';

export async function RecommendedSection() {
  const { session, profile } = await requireOnboardedUser();

  const interestIds = (profile.interests ?? []).map(
    ({ interestId }: { interestId: string }) => interestId,
  );

  const recommended = await buildRecommendations({
    userId: session.user.id,
    experienceLevel: profile.experienceLevel!,
    interestIds,
  });

  if (recommended.length === 0) {
    return <EmptyRecommendations />;
  }

  return (
    <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[680px]:grid-cols-1">
      {recommended.map(
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
            from="home"
            transitionSource="home-recommended"
          />
        ),
      )}
    </div>
  );
}
