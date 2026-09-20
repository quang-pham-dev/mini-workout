import { WorkoutDetailSection } from './components/workout-detail-section';
import { WorkoutHeroSection } from './components/workout-hero-section';
import { WorkoutDetailQuery } from './queries';
import type { WorkoutTransitionSource } from '@/components/view-transitions/workout-thumbnail';
import { WorkoutEngagementHydration } from '@/components/workout-engagement-hydration';
import { notFound } from 'next/navigation';

export { BackButton } from './components/back-button';

type WorkoutContentProps = {
  slug: string;
  transitionSource?: WorkoutTransitionSource;
};

export async function WorkoutContent({
  slug,
  transitionSource,
}: WorkoutContentProps) {
  const { viewerId, workout } = await WorkoutDetailQuery({ slug });

  if (!workout) notFound();

  const {
    id,
    thumbnailUrl,
    title,
    description,
    durationMinutes,
    level,
    coach,
    category,
  } = workout;

  return (
    <WorkoutEngagementHydration viewerId={viewerId} workouts={[workout]}>
      <WorkoutHeroSection
        id={id}
        thumbnailUrl={thumbnailUrl}
        transitionSource={transitionSource}
      />
      <WorkoutDetailSection
        viewerId={viewerId}
        id={id}
        title={title}
        description={description}
        durationMinutes={durationMinutes}
        level={level}
        coach={coach}
        category={category}
      />
    </WorkoutEngagementHydration>
  );
}
