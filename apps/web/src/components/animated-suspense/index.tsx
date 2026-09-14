import { Suspense, ViewTransition } from 'react';

type AnimatedSuspenseProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function AnimatedSuspense({
  children,
  fallback,
}: AnimatedSuspenseProps) {
  return (
    <Suspense
      fallback={
        <ViewTransition default="none" exit="auto">
          {fallback}
        </ViewTransition>
      }
    >
      <ViewTransition enter="auto" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  );
}
