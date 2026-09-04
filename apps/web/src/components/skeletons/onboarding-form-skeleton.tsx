export function OnboardingFormSkeleton() {
  return (
    <div aria-hidden>
      <div className="animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none my-2.5 h-6 w-[55%]" />
      <div className="animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none my-2 h-3 w-[75%]" />
      {[0, 1, 2, 3, 4].map((row) => (
        <div
          className="animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none my-2.5 h-11"
          key={row}
        />
      ))}
      <div className="animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none mt-4 h-12" />
    </div>
  );
}
