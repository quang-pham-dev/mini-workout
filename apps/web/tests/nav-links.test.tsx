// @vitest-environment jsdom
import { NavLinks } from '@/components/navigation/nav-links';
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const usePathnameMock = vi.fn(() => '/home');

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

describe('NavLinks focus management', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    usePathnameMock.mockReturnValue('/home');
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.replaceChildren();
  });

  it('does not focus the hamburger on initial desktop mount, but restores it after close', async () => {
    await act(async () => {
      root.render(<NavLinks />);
    });

    const trigger = container.querySelector(
      'button[aria-label="Open navigation menu"]',
    ) as HTMLButtonElement;
    expect(document.activeElement).not.toBe(trigger);

    await act(async () => trigger.click());
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Close navigation menu',
    );

    const close = container.ownerDocument.body.querySelector(
      'button[aria-label="Close navigation menu"]',
    ) as HTMLButtonElement;
    await act(async () => close.click());
    expect(document.activeElement).toBe(trigger);
  });
});
