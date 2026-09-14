type AuthCardSkeletonProps = {
  fieldsCount?: number;
};

const LABEL_WIDTHS = ['w-12', 'w-16', 'w-16', 'w-28'];

export function AuthCardSkeleton({ fieldsCount = 2 }: AuthCardSkeletonProps) {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-background px-4 py-8">
      <section
        aria-busy="true"
        aria-label="Loading authentication form"
        className="w-[min(100%,28rem)] rounded-2xl border border-border-default bg-surface p-8 shadow-[0_1rem_3rem_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]"
      >
        {/* Title */}
        <div className="animate-shimmer mx-auto h-7 w-44 rounded-md bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none dark:bg-[linear-gradient(90deg,rgb(255_255_255/6%)_25%,rgb(255_255_255/12%)_37%,rgb(255_255_255/6%)_63%)]" />

        {/* Subtitle */}
        <div className="animate-shimmer mx-auto mt-2 mb-6 h-4 w-64 rounded bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none dark:bg-[linear-gradient(90deg,rgb(255_255_255/6%)_25%,rgb(255_255_255/12%)_37%,rgb(255_255_255/6%)_63%)]" />

        {/* Form fields */}
        <div className="grid gap-4">
          {Array.from({ length: fieldsCount }).map((_, index) => (
            <div className="grid gap-[0.4rem]" key={index}>
              {/* Field label */}
              <div
                className={`animate-shimmer h-4 ${LABEL_WIDTHS[index % LABEL_WIDTHS.length]} rounded bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none dark:bg-[linear-gradient(90deg,rgb(255_255_255/6%)_25%,rgb(255_255_255/12%)_37%,rgb(255_255_255/6%)_63%)]`}
              />
              {/* Field input */}
              <div className="animate-shimmer h-11 w-full rounded-lg border border-border-default bg-[linear-gradient(90deg,rgb(0_0_0/3%)_25%,rgb(0_0_0/7%)_37%,rgb(0_0_0/3%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none dark:bg-[linear-gradient(90deg,rgb(255_255_255/3%)_25%,rgb(255_255_255/7%)_37%,rgb(255_255_255/3%)_63%)]" />
            </div>
          ))}

          {/* Submit button */}
          <div className="animate-shimmer h-11 w-full rounded-lg bg-primary/20 bg-[linear-gradient(90deg,transparent_25%,rgb(255_255_255/25%)_37%,transparent_63%)] bg-[length:400%_100%] motion-reduce:animate-none" />
        </div>

        {/* Footer text */}
        <div className="animate-shimmer mx-auto mt-5 h-4 w-52 rounded bg-[linear-gradient(90deg,rgb(0_0_0/6%)_25%,rgb(0_0_0/12%)_37%,rgb(0_0_0/6%)_63%)] bg-[length:400%_100%] motion-reduce:animate-none dark:bg-[linear-gradient(90deg,rgb(255_255_255/6%)_25%,rgb(255_255_255/12%)_37%,rgb(255_255_255/6%)_63%)]" />
      </section>
    </main>
  );
}
