import { WorkoutDetailSection } from './components/workout-detail-section';
import { WorkoutHeroSection } from './components/workout-hero-section';
import { WorkoutDetailQuery } from './queries';
import type { WorkoutTransitionSource } from '@/components/view-transitions/workout-thumbnail';
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
  const workout = await WorkoutDetailQuery({ slug });

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
    _count,
    likes,
    favorites,
  } = workout;

  return (
    <>
      <WorkoutHeroSection
        id={id}
        thumbnailUrl={thumbnailUrl}
        transitionSource={transitionSource}
      />
      <WorkoutDetailSection
        id={id}
        title={title}
        description={description}
        durationMinutes={durationMinutes}
        level={level}
        likeCount={_count?.likes}
        coach={coach}
        category={category}
        likes={likes}
        favorites={favorites}
      />
    </>
  );
}
