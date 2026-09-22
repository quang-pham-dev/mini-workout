// @vitest-environment jsdom
import { CategoryWorkoutsSkeleton } from '@/features/categories';
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CategoryWorkoutsSkeleton', () => {
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

  it('renders the category heading and workout card layout while loading', async () => {
    await act(async () => {
      root.render(<CategoryWorkoutsSkeleton />);
    });

    const section = container.querySelector('section');
    expect(section?.getAttribute('aria-busy')).toBe('true');
    expect(section?.getAttribute('aria-label')).toBe(
      'Loading category workouts',
    );
    expect(
      container.querySelectorAll('.animate-shimmer').length,
    ).toBeGreaterThan(50);
    expect(container.querySelector('.grid.grid-cols-3')?.children.length).toBe(
      6,
    );
  });
});
