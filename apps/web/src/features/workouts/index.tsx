import { WorkoutDetailSection } from './components/workout-detail-section';
import { WorkoutHeroSection } from './components/workout-hero-section';
import { WorkoutDetailQuery } from './queries';
import { notFound } from 'next/navigation';

export { BackButton } from './components/back-button';

type WorkoutContentProps = {
  params: Promise<{ slug: string }>;
};

export async function WorkoutContent({ params }: WorkoutContentProps) {
  const { slug } = await params;
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
      <WorkoutHeroSection thumbnailUrl={thumbnailUrl} />
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
