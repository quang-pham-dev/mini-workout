// @vitest-environment jsdom
import { OnboardingFormSkeleton } from '@/components/skeletons/onboarding-form-skeleton';
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('OnboardingFormSkeleton', () => {
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

  it('renders accessible loading state and full two-column layout structure', async () => {
    await act(async () => {
      root.render(<OnboardingFormSkeleton />);
    });

    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    expect(main?.getAttribute('aria-busy')).toBe('true');
    expect(main?.getAttribute('aria-label')).toBe('Loading onboarding');

    // Check two-column grid container
    const gridContainer = main?.querySelector('.grid.max-w-6xl');
    expect(gridContainer).toBeTruthy();

    // Check left column (sidebar) and right column (form card)
    const sections = gridContainer?.querySelectorAll('section');
    expect(sections?.length).toBe(2);

    // Right card has interest placeholders and experience level placeholders
    const formCard = sections?.[1];
    expect(formCard?.classList.contains('bg-surface')).toBe(true);

    // Verify shimmer elements are present
    const shimmers = container.querySelectorAll('.animate-shimmer');
    expect(shimmers.length).toBeGreaterThan(10);
  });
});
