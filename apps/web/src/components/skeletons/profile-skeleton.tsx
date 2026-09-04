export function ProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading profile"
      className="flex flex-col gap-6"
    >
      <div className="mb-6 flex items-center gap-6">
        <div className="animate-shimmer size-[4.5rem] rounded-full bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
        <div className="flex w-56 flex-col gap-2">
          <div className="animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none my-2.5 h-6" />
          <div className="animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none my-2 h-3" />
        </div>
      </div>

      <div className="animate-shimmer h-[140px] w-full rounded-[1.25rem] bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
      <div className="animate-shimmer h-[180px] w-full rounded-[1.25rem] bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
    </div>
  );
}
