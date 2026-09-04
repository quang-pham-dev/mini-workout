'use client';

import styles from './theme.module.css';
import * as React from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

export const THEME_STORAGE_KEY = 'mini-workout-theme';
export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
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
  meta.setAttribute('content', theme === 'dark' ? '#111318' : '#ffffff');
}

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function initialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const bootstrapPreference = document.documentElement.dataset.themePreference;
  if (isTheme(bootstrapPreference)) return bootstrapPreference;
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(storedTheme) ? storedTheme : 'light';
}

function initialSystemTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'light';
  const bootstrapTheme = document.documentElement.dataset.theme;
  if (bootstrapTheme === 'dark' || bootstrapTheme === 'light') {
    return bootstrapTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [systemTheme, setSystemTheme] =
    useState<ResolvedTheme>(initialSystemTheme);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(storedTheme)) setThemeState(storedTheme);
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
    root.dataset.themePreference = theme;
    applyTheme(resolvedTheme);
  }, [resolvedTheme, theme]);

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
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
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    options.findIndex((option) => option.value === theme),
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setActiveIndex(options.findIndex((option) => option.value === theme));
  }, [theme]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
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
    <div className={styles.toggle}>
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
        {theme}
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
