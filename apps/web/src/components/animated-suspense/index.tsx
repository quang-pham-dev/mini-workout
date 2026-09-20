import { Suspense, ViewTransition } from 'react';

type AnimatedSuspenseProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: 'none' | 'reveal';
};

export function AnimatedSuspense({
  children,
  fallback,
  variant = 'none',
}: AnimatedSuspenseProps) {
  return (
    <Suspense
      fallback={
        variant === 'reveal' ? (
          <ViewTransition default="none" exit="slide-down">
            {fallback}
          </ViewTransition>
        ) : (
          fallback
        )
      }
    >
      {variant === 'reveal' ? (
        <ViewTransition enter="slide-up" default="none">
          {children}
        </ViewTransition>
      ) : (
        children
      )}
    </Suspense>
  );
}
