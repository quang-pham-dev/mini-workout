'use client';

import { MoonIcon } from './moon-icon';
import { SunIcon } from './sun-icon';
import { SystemIcon } from './system-icon';
import { cn } from '@mini-workout/ui';
import * as React from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

export const THEME_STORAGE_KEY = 'mini-workout-theme';
const DARK_THEME_COLOR = 'oklch(0.14 0.008 250)';
export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  mounted: boolean;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.append(meta);
  }
  meta.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : '#ffffff');
}

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be disabled or unavailable in privacy-restricted contexts.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const bootstrapPreference =
      document.documentElement.dataset.themePreference;
    const storedTheme = readStoredTheme();
    const preference = isTheme(bootstrapPreference)
      ? bootstrapPreference
      : isTheme(storedTheme)
        ? storedTheme
        : 'light';
    setThemeState(preference);
    setMounted(true);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      try {
        if (event.storageArea && event.storageArea !== localStorage) return;
      } catch {
        return;
      }
      setThemeState(isTheme(event.newValue) ? event.newValue : 'light');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () =>
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    updateSystemTheme();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateSystemTheme);
      return () => mediaQuery.removeEventListener('change', updateSystemTheme);
    }

    mediaQuery.addListener(updateSystemTheme);
    return () => mediaQuery.removeListener(updateSystemTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!mounted) return;
    root.dataset.themePreference = theme;
    applyTheme(resolvedTheme);
  }, [mounted, resolvedTheme, theme]);

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);
    persistTheme(nextTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, mounted, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <SunIcon className="size-4" /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon className="size-4" /> },
  { value: 'system', label: 'System', icon: <SystemIcon className="size-4" /> },
];

export function ThemeToggle({ className }: { className?: string } = {}) {
  const { theme, mounted, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    options.findIndex((option) => option.value === theme),
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const toggleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIndex(options.findIndex((option) => option.value === theme));
  }, [theme]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!toggleRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleFocusIn(event: FocusEvent) {
      if (!toggleRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveFocusAfterTab(event: React.KeyboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const currentIndex = focusable.indexOf(event.target as HTMLElement);
    const direction = event.shiftKey ? -1 : 1;
    let nextElement: HTMLElement | undefined;
    for (
      let index = currentIndex + direction;
      index >= 0 && index < focusable.length;
      index += direction
    ) {
      const candidate = focusable[index];
      if (candidate && !toggleRef.current?.contains(candidate)) {
        nextElement = candidate;
        break;
      }
    }

    setOpen(false);
    nextElement?.focus();
  }

  function selectTheme(value: Theme) {
    setTheme(value);
    closeMenu();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'ArrowDown'
    ) {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') {
      moveFocusAfterTab(event);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) =>
        event.key === 'ArrowDown'
          ? (index + 1) % options.length
          : (index - 1 + options.length) % options.length,
      );
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const activeOption = options[activeIndex] ?? options[0];
      if (activeOption) selectTheme(activeOption.value);
    }
  }

  const currentIcon = !mounted ? (
    <SunIcon className="size-4.5" />
  ) : theme === 'dark' ? (
    <MoonIcon className="size-4.5" />
  ) : theme === 'system' ? (
    <SystemIcon className="size-4.5" />
  ) : (
    <SunIcon className="size-4.5" />
  );

  return (
    <div
      ref={toggleRef}
      className={cn('relative inline-flex items-center', className)}
    >
      <button
        ref={triggerRef}
        className={cn(
          'flex size-9 items-center justify-center rounded-full border border-border-subtle bg-surface text-text-secondary transition-[color,background-color,border-color,box-shadow,transform] hover:border-border-strong hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:scale-95 sm:size-10',
          open &&
            'border-border-strong bg-surface-sunken text-text-primary shadow-[0_1px_3px_oklch(0_0_0/0.08)]',
        )}
        type="button"
        aria-label="Theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={handleTriggerKeyDown}
      >
        {currentIcon}
        <span className="sr-only capitalize">{mounted ? theme : 'Theme'}</span>
      </button>
      {open ? (
        <div
          className="absolute top-[calc(100%+0.5rem)] right-0 z-[60] flex min-w-36 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-2xl border border-border-subtle bg-surface p-1.5 shadow-[0_12px_32px_oklch(0_0_0/0.14)] backdrop-blur-md"
          role="menu"
          aria-label="Theme options"
          onKeyDown={handleMenuKeyDown}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              className={cn(
                'flex min-h-9 w-full min-w-0 items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-[13px] font-medium transition-[background-color,color] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                theme === option.value
                  ? 'bg-surface-raised font-semibold text-text-primary shadow-[0_1px_3px_oklch(0_0_0/0.08)]'
                  : 'text-text-secondary hover:bg-surface-sunken hover:text-text-primary',
              )}
              type="button"
              role="menuitemradio"
              aria-checked={theme === option.value}
              tabIndex={index === activeIndex ? 0 : -1}
              data-theme-option={option.value}
              onClick={() => selectTheme(option.value)}
            >
              <span className="flex items-center gap-2">
                <span className="text-text-secondary">{option.icon}</span>
                <span>{option.label}</span>
              </span>
              {theme === option.value ? (
                <span
                  className="size-1.5 rounded-full bg-highlight"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
