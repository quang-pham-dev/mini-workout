import {
  WorkoutThumbnailTransition,
  type WorkoutTransitionSource,
} from '@/components/view-transitions/workout-thumbnail';
import Image from 'next/image';

type WorkoutHeroSectionProps = {
  id: string;
  thumbnailUrl: string;
  transitionSource?: WorkoutTransitionSource;
};

export function WorkoutHeroSection({
  id,
  thumbnailUrl,
  transitionSource,
}: WorkoutHeroSectionProps) {
  return (
    <section className="relative mt-8 overflow-hidden rounded-3xl bg-surface-sunken [&_img]:block [&_img]:max-h-[32rem] [&_img]:w-full [&_img]:object-cover">
      <WorkoutThumbnailTransition workoutId={id} source={transitionSource}>
        <Image src={thumbnailUrl} alt="" width={1200} height={800} priority />
      </WorkoutThumbnailTransition>
      <div className="absolute right-4 bottom-4 rounded-full bg-[oklch(0.1_0_0/0.72)] px-3 py-2 text-[0.8rem] text-white">
        Video placeholder
      </div>
    </section>
  );
}
