// @vitest-environment jsdom
import { ThemeProvider, ThemeToggle, useTheme } from '@/components/theme/theme';
import * as React from 'react';
import { act } from 'react';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'mini-workout-theme';
const mountedRoots: ReturnType<typeof createRoot>[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function ThemeProbe() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    document.body.dataset.theme = `${theme}:${resolvedTheme}`;
  }, [resolvedTheme, theme]);

  return null;
}

function renderTheme(children: React.ReactNode = <ThemeProbe />) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(<ThemeProvider>{children}</ThemeProvider>);
  });
  mountedRoots.push(root);
  return { container, root };
}

function setSystemTheme(isDark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    matches: isDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => listeners.add(listener),
    removeEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => listeners.delete(listener),
  } as unknown as MediaQueryList;

  vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQuery);
  return {
    setDark(nextIsDark: boolean) {
      Object.defineProperty(mediaQuery, 'matches', { value: nextIsDark });
      listeners.forEach((listener) =>
        listener({ matches: nextIsDark } as MediaQueryListEvent),
      );
    },
  };
}

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    } satisfies Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'>,
  });
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
  document.querySelector('meta[name="theme-color"]')?.remove();
  setSystemTheme(false);
});

afterEach(() => {
  act(() => {
    mountedRoots.splice(0).forEach((root) => root.unmount());
  });
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

it('defaults to Light and persists a selected theme with document metadata', async () => {
  renderTheme();

  await act(async () => {});

  expect(document.body.dataset.theme).toBe('light:light');
  expect(document.documentElement.className).not.toContain('dark');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(document.documentElement.style.colorScheme).toBe('light');

  const toggle = renderTheme(<ThemeToggle />).container;
  const darkButton = toggle.querySelector(
    '[data-theme-option="dark"]',
  ) as HTMLButtonElement;
  await act(async () => darkButton.click());

  expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  expect(document.documentElement.className).toContain('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(
    document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
  ).toBe('#111318');
});

it('follows system changes only while System is selected', async () => {
  const system = setSystemTheme(false);
  const { container } = renderTheme(<ThemeToggle />);
  const systemButton = container.querySelector(
    '[data-theme-option="system"]',
  ) as HTMLButtonElement;

  await act(async () => systemButton.click());
  expect(document.documentElement.dataset.theme).toBe('light');

  await act(async () => system.setDark(true));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.className).toContain('dark');
});

it('exposes three labelled radio options with one selected', () => {
  const { container } = renderTheme(<ThemeToggle />);
  const group = container.querySelector('[role="radiogroup"]');
  const options = container.querySelectorAll('[role="radio"]');

  expect(group?.getAttribute('aria-label')).toBe('Color theme');
  expect(options).toHaveLength(3);
  expect([...options].map((option) => option.textContent)).toEqual([
    'Light',
    'Dark',
    'System',
  ]);
  expect(
    container
      .querySelector('[aria-checked="true"]')
      ?.getAttribute('data-theme-option'),
  ).toBe('light');
});
