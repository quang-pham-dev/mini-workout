// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock('next/link', () => ({
  default: ({
    children,
    transitionTypes,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    transitionTypes?: string[];
  }) => (
    <a {...props} data-transition-types={transitionTypes?.join(',')}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: () => <span data-testid="workout-thumbnail" />,
}));

vi.mock('@/lib/workouts/actions', () => ({
  toggleWorkoutFavorite: vi.fn(),
  toggleWorkoutLike: vi.fn(),
}));

const { WorkoutCard } = await import('@/components/workout-card');
const { getWorkoutThumbnailTransitionName } =
  await import('@/components/view-transitions/workout-thumbnail');

describe('WorkoutCard navigation', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.replaceChildren();
  });

  it('makes the thumbnail part of the forward detail link', async () => {
    await act(async () => {
      root.render(
        <WorkoutCard
          id="workout-1"
          title="Move better, feel lighter"
          slug="move-better"
          description="A short mobility flow."
          durationMinutes={20}
          level="BEGINNER"
          thumbnailUrl="https://example.com/workout.jpg"
          coach={{ name: 'Ava', bio: 'Coach' }}
          category={{ name: 'Mobility' }}
          _count={{ likes: 0 }}
          likes={[]}
          favorites={[]}
          from="home"
          transitionSource="home-recommended"
        />,
      );
    });

    const link = container.querySelector<HTMLAnchorElement>('a');

    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe(
      '/workouts/move-better?from=home&transition=home-recommended',
    );
    expect(
      link?.querySelector('[data-testid="workout-thumbnail"]'),
    ).toBeTruthy();
    expect(link?.getAttribute('data-transition-types')).toBe('nav-forward');
  });

  it('uses a distinct transition namespace for each list source', async () => {
    expect(
      getWorkoutThumbnailTransitionName(
        'duplicate-workout',
        'home-recommended',
      ),
    ).not.toBe(
      getWorkoutThumbnailTransitionName('duplicate-workout', 'home-latest'),
    );

    await act(async () => {
      root.render(
        <>
          <WorkoutCard
            id="duplicate-workout"
            title="Recommended workout"
            slug="recommended-workout"
            description="Recommended"
            durationMinutes={20}
            level="BEGINNER"
            thumbnailUrl="https://example.com/recommended.jpg"
            coach={{ name: 'Ava', bio: 'Coach' }}
            category={{ name: 'Mobility' }}
            _count={{ likes: 0 }}
            likes={[]}
            favorites={[]}
            from="home"
            transitionSource="home-recommended"
          />
          <WorkoutCard
            id="duplicate-workout"
            title="Latest workout"
            slug="latest-workout"
            description="Latest"
            durationMinutes={20}
            level="BEGINNER"
            thumbnailUrl="https://example.com/latest.jpg"
            coach={{ name: 'Ava', bio: 'Coach' }}
            category={{ name: 'Mobility' }}
            _count={{ likes: 0 }}
            likes={[]}
            favorites={[]}
            from="home"
            transitionSource="home-latest"
          />
        </>,
      );
    });

    expect(
      container.querySelector('a[href*="transition=home-recommended"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href*="transition=home-latest"]'),
    ).toBeTruthy();
  });
});
