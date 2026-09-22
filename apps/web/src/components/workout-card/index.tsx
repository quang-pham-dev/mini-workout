import { WorkoutActions } from './workout-actions';
import {
  WorkoutThumbnailTransition,
  type WorkoutTransitionSource,
} from '@/components/view-transitions/workout-thumbnail';
import { formatDuration } from '@/lib/utils/format';
import type { WorkoutCard as WorkoutCardData } from '@mini-workout/core/workouts';
import Image from 'next/image';
import Link from 'next/link';

type WorkoutCardProps = WorkoutCardData & {
  viewerId: string;
  from?: string;
  transitionSource?: WorkoutTransitionSource;
};

export function WorkoutCard({
  viewerId,
  id,
  title,
  slug,
  description,
  durationMinutes,
  thumbnailUrl,
  coach,
  category,
  from,
  transitionSource,
}: WorkoutCardProps) {
  const detailHref = from
    ? `/workouts/${slug}?from=${from}${transitionSource ? `&transition=${transitionSource}` : ''}`
    : `/workouts/${slug}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-border-subtle bg-surface transition-[border-color,box-shadow,transform] duration-[160ms] ease-[ease] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_1rem_2.5rem_oklch(0.2_0.02_250/0.08)] focus-within:[outline:3px_solid_color-mix(in_oklch,var(--color-ring)_38%,transparent)] focus-within:outline-offset-2 motion-reduce:transition-none">
      <Link
        className="block focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-3px]"
        href={detailHref}
        aria-label={`Open ${title}`}
        transitionTypes={['nav-forward']}
      >
        <WorkoutThumbnailTransition workoutId={id} source={transitionSource}>
          <Image
            className="block aspect-[1.35] w-full bg-surface-sunken object-cover"
            src={thumbnailUrl}
            alt=""
            loading="eager"
            width={1200}
            height={900}
          />
        </WorkoutThumbnailTransition>
      </Link>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-text-tertiary">
          <span className="font-bold text-highlight-foreground">
            {category.name}
          </span>
          <span>{formatDuration(durationMinutes)}</span>
        </div>
        <h3 className="mt-[0.55rem] mb-[0.35rem] text-[1.05rem] tracking-[-0.025em]">
          <Link
            className="text-inherit no-underline"
            href={detailHref}
            transitionTypes={['nav-forward']}
          >
            {title}
          </Link>
        </h3>
        <p className="m-0 line-clamp-2 text-[0.85rem] leading-[1.5] text-text-secondary">
          {description}
        </p>
        <p className="mt-4 mb-0 text-[0.78rem] text-text-tertiary">
          with {coach.name}
        </p>
        <WorkoutActions viewerId={viewerId} workoutId={id} />
      </div>
    </article>
  );
}
