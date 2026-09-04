type HomeFeedSkeletonProps = {
  count: number;
};

export function HomeFeedSkeleton({ count }: HomeFeedSkeletonProps) {
  return (
    <div
      aria-hidden
      className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="flex flex-col gap-2" key={index}>
          <div className="animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none aspect-[4/3] w-full" />
          <div className="animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none my-2.5 h-6 w-[60%]" />
          <div className="animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none my-2 h-3 w-[90%]" />
          <div className="animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none my-2 h-3 w-[40%]" />
        </div>
      ))}
    </div>
  );
}
