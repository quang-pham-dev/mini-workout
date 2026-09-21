import { WorkoutPlayer } from './workout-player';
import {
  WorkoutThumbnailTransition,
  type WorkoutTransitionSource,
} from '@/components/view-transitions/workout-thumbnail';

type WorkoutHeroSectionProps = {
  id: string;
  thumbnailUrl: string;
  title: string;
  transitionSource?: WorkoutTransitionSource;
  videoSourceType: 'MP4' | 'HLS';
  videoUrl: string;
};

export function WorkoutHeroSection({
  id,
  thumbnailUrl,
  title,
  transitionSource,
  videoSourceType,
  videoUrl,
}: WorkoutHeroSectionProps) {
  return (
    <section aria-label={`${title} video`} className="mt-8">
      <WorkoutThumbnailTransition workoutId={id} source={transitionSource}>
        <WorkoutPlayer
          poster={thumbnailUrl}
          sourceType={videoSourceType}
          src={videoUrl}
          title={title}
        />
      </WorkoutThumbnailTransition>
    </section>
  );
}
