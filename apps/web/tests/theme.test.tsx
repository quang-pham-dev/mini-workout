// @vitest-environment jsdom
import { ThemeProvider, ThemeToggle, useTheme } from '@/components/theme/theme';
import * as React from 'react';
import { act } from 'react';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
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
  act(() => {
    mountedRoots.splice(0).forEach((root) => root.unmount());
  });
  document.body.replaceChildren();
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
  document.documentElement.removeAttribute('data-theme-preference');
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
  expect(document.documentElement.classList).toContain('light');
  expect(document.documentElement.className).not.toContain('dark');
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(document.documentElement.style.colorScheme).toBe('light');

  const toggle = renderTheme(<ThemeToggle />).container;
  const trigger = toggle.querySelector(
    'button[aria-label="Theme"]',
  ) as HTMLButtonElement;
  await act(async () => trigger.click());
  const darkButton = toggle.querySelector(
    '[role="menuitemradio"][data-theme-option="dark"]',
  ) as HTMLButtonElement;
  await act(async () => darkButton.click());

  expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  expect(document.documentElement.className).toContain('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(
    document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
  ).toBe('oklch(0.14 0.008 250)');
  expect(document.documentElement.dataset.themePreference).toBe('dark');
});

it('hydrates a persisted Dark preference without resetting through Light', async () => {
  localStorage.setItem(STORAGE_KEY, 'dark');
  document.documentElement.classList.add('dark');
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.dataset.themePreference = 'dark';

  const { container } = renderTheme(<ThemeToggle />);
  await act(async () => {});

  const trigger = container.querySelector(
    'button[aria-label="Theme"]',
  ) as HTMLButtonElement;
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  await act(async () => trigger.click());
  expect(
    container
      .querySelector('[aria-checked="true"]')
      ?.getAttribute('data-theme-option'),
  ).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

it('follows system changes only while System is selected', async () => {
  const system = setSystemTheme(false);
  const { container } = renderTheme(<ThemeToggle />);
  const trigger = container.querySelector(
    'button[aria-label="Theme"]',
  ) as HTMLButtonElement;
  await act(async () => trigger.click());
  const systemButton = container.querySelector(
    '[data-theme-option="system"]',
  ) as HTMLButtonElement;
  await act(async () => systemButton.click());
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(document.documentElement.dataset.themePreference).toBe('system');

  await act(async () => system.setDark(true));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.className).toContain('dark');

  await act(async () => system.setDark(false));
  expect(document.documentElement.dataset.theme).toBe('light');
});

it('does not change an explicit theme when the system preference changes', async () => {
  const system = setSystemTheme(false);
  const { container } = renderTheme(<ThemeToggle />);
  const trigger = container.querySelector(
    'button[aria-label="Theme"]',
  ) as HTMLButtonElement;
  await act(async () => trigger.click());
  const darkButton = container.querySelector(
    '[data-theme-option="dark"]',
  ) as HTMLButtonElement;
  await act(async () => darkButton.click());

  await act(async () => system.setDark(false));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.dataset.themePreference).toBe('dark');
});

it('keeps explicit Light resolved when the operating system is dark', async () => {
  setSystemTheme(true);
  localStorage.setItem(STORAGE_KEY, 'light');

  renderTheme();
  await act(async () => {});

  expect(document.documentElement.dataset.theme).toBe('light');
  expect(document.documentElement.classList).toContain('light');
  expect(document.documentElement.classList).not.toContain('dark');
});

it('renders stable server markup before adopting a persisted theme', async () => {
  localStorage.setItem(STORAGE_KEY, 'dark');
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.dataset.themePreference = 'dark';

  expect(
    renderToString(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    ),
  ).toContain('>Theme<');

  const { container } = renderTheme(<ThemeToggle />);
  await act(async () => {});
  expect(
    container.querySelector('button[aria-label="Theme"]')?.textContent,
  ).toBe('dark');
});

it('ignores storage failures while initializing, selecting, and receiving changes', async () => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    },
  });

  const { container } = renderTheme(<ThemeToggle />);
  await act(async () => {});
  const trigger = container.querySelector(
    'button[aria-label="Theme"]',
  ) as HTMLButtonElement;
  await act(async () => trigger.click());
  const darkButton = container.querySelector(
    '[data-theme-option="dark"]',
  ) as HTMLButtonElement;
  await act(async () => darkButton.click());
  expect(document.documentElement.dataset.theme).toBe('dark');

  await act(async () =>
    window.dispatchEvent(
      new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'light' }),
    ),
  );
  expect(document.body.dataset.theme).toBe('light:light');
  expect(document.documentElement.dataset.themePreference).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('light');
});

it.each([null, 'invalid'])(
  'falls back to Light when a storage event has value %s',
  async (newValue) => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { container } = renderTheme(<ThemeToggle />);
    await act(async () => {});
    expect(
      container.querySelector('button[aria-label="Theme"]')?.textContent,
    ).toBe('dark');

    await act(async () =>
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY, newValue }),
      ),
    );

    expect(document.body.dataset.theme).toBe('light:light');
    expect(document.documentElement.dataset.themePreference).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  },
);

it('exposes an accessible Theme menu with keyboard navigation', async () => {
  const { container } = renderTheme(<ThemeToggle />);
  const trigger = container.querySelector(
    'button[aria-label="Theme"]',
  ) as HTMLButtonElement;

  expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  await act(async () =>
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    ),
  );

  const menu = container.querySelector('[role="menu"]') as HTMLElement;
  const options = container.querySelectorAll('[role="menuitemradio"]');
  expect(menu).toBeTruthy();
  expect([...options].map((option) => option.textContent)).toEqual([
    'Light',
    'Dark',
    'System',
  ]);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(document.activeElement).toBe(options[0]);

  await act(async () =>
    options[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    ),
  );
  expect(document.activeElement).toBe(options[1]);
  await act(async () =>
    options[1]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    ),
  );
  expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  expect(document.activeElement).toBe(trigger);
});

it('closes the menu when focus leaves it with Tab', async () => {
  const { container } = renderTheme(<ThemeToggle />);
  const trigger = container.querySelector(
    'button[aria-label="Theme"]',
  ) as HTMLButtonElement;
  await act(async () => trigger.click());
  const outside = document.createElement('button');
  document.body.append(outside);

  await act(async () => outside.focus());

  expect(container.querySelector('[role="menu"]')).toBeNull();
});

it('closes the menu when Tab is pressed from a menu option', async () => {
  const { container } = renderTheme(
    <>
      <button type="button">Previous control</button>
      <ThemeToggle />
      <button type="button">Next control</button>
    </>,
  );
  const trigger = container.querySelector(
    'button[aria-label="Theme"]',
  ) as HTMLButtonElement;
  await act(async () => trigger.click());
  const option = container.querySelector(
    '[role="menuitemradio"]',
  ) as HTMLElement;

  await act(async () =>
    option.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    ),
  );

  expect(container.querySelector('[role="menu"]')).toBeNull();
  expect(document.activeElement).toBe(
    [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Next control',
    ),
  );
});

it('closes the menu on a pointer outside without stealing outside focus', async () => {
  const { container } = renderTheme(<ThemeToggle />);
  const trigger = container.querySelector(
    'button[aria-label="Theme"]',
  ) as HTMLButtonElement;
  await act(async () => trigger.click());
  const outside = document.createElement('button');
  document.body.append(outside);

  await act(async () => {
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    outside.focus();
  });

  expect(container.querySelector('[role="menu"]')).toBeNull();
  expect(document.activeElement).toBe(outside);
});
