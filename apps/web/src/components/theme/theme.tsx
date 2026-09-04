'use client';

import styles from './theme.module.css';
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

const options: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ThemeToggle() {
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

  return (
    <div ref={toggleRef} className={styles.toggle}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-label="Theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={handleTriggerKeyDown}
      >
        {mounted ? theme : 'Theme'}
      </button>
      {open ? (
        <div
          className={styles.menu}
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
              className={styles.option}
              type="button"
              role="menuitemradio"
              aria-checked={theme === option.value}
              tabIndex={index === activeIndex ? 0 : -1}
              data-theme-option={option.value}
              onClick={() => selectTheme(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
