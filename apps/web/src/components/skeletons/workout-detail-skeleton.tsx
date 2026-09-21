export function WorkoutDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading workout details">
      {/* Hero Media Skeleton */}
      <div className="relative mt-8 overflow-hidden rounded-3xl bg-surface-sunken">
        <div className="animate-shimmer aspect-video w-full rounded-3xl bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
      </div>

      {/* Content Skeleton */}
      <div className="max-w-3xl py-[clamp(2rem,6vw,5rem)]">
        {/* Category */}
        <div className="animate-shimmer mb-4 h-3.5 w-24 rounded bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />

        {/* Title */}
        <div className="animate-shimmer h-10 sm:h-12 md:h-14 w-[75%] rounded-xl bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />

        {/* Description */}
        <div className="mt-6 flex flex-col gap-2.5">
          <div className="animate-shimmer h-4 w-[90%] rounded bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
          <div className="animate-shimmer h-4 w-[65%] rounded bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
        </div>

        {/* Metadata Pills */}
        <div className="mt-6 flex flex-wrap gap-[0.65rem]">
          <div className="animate-shimmer h-8 w-16 rounded-full bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
          <div className="animate-shimmer h-8 w-20 rounded-full bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
          <div className="animate-shimmer h-8 w-28 rounded-full bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-2">
          <div className="animate-shimmer h-9 w-14 rounded-full bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
          <div className="animate-shimmer h-9 w-20 rounded-full bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
        </div>

        {/* Coach Bio */}
        <div className="mt-12 border-t border-border-subtle pt-6">
          <div className="animate-shimmer h-4 w-32 rounded bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
          <div className="animate-shimmer mt-2 h-4 w-72 rounded bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
