'use client';

import { MoonIcon } from './moon-icon';
import { SunIcon } from './sun-icon';
import { SystemIcon } from './system-icon';
import { useTheme } from './theme';
import { cn } from '@mini-workout/ui';
import * as React from 'react';

export function ThemeSelector() {
  const { theme, setTheme, mounted } = useTheme();

  const themeCards = [
    {
      value: 'light' as const,
      label: 'Light',
      description: 'Default light appearance',
      icon: <SunIcon className="size-5" />,
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      description: 'Deep contrast for night',
      icon: <MoonIcon className="size-5" />,
    },
    {
      value: 'system' as const,
      label: 'System',
      description: 'Sync with device preference',
      icon: <SystemIcon className="size-5" />,
    },
  ];

  return (
    <div
      className="grid grid-cols-3 gap-3 max-[600px]:grid-cols-1"
      role="radiogroup"
      aria-label="Theme preference"
    >
      {themeCards.map((card) => {
        const selected = mounted && theme === card.value;
        return (
          <button
            key={card.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(card.value)}
            className={cn(
              'group relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:translate-y-0',
              selected
                ? 'border-highlight bg-highlight-soft/40 shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-highlight)_25%,transparent)]'
                : 'border-border-subtle bg-surface-raised hover:bg-surface-sunken',
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-xl border transition-colors',
                  selected
                    ? 'border-highlight/40 bg-highlight/15 text-highlight-foreground'
                    : 'border-border-subtle bg-surface text-text-secondary group-hover:text-text-primary',
                )}
              >
                {card.icon}
              </span>
              <span
                className={cn(
                  'grid size-5 place-items-center rounded-full border text-[11px] transition-colors',
                  selected
                    ? 'border-highlight bg-highlight font-bold text-highlight-foreground'
                    : 'border-border-subtle text-transparent',
                )}
                aria-hidden="true"
              >
                ✓
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.95rem] font-bold text-text-primary">
                {card.label}
              </span>
              <span className="text-[0.8rem] leading-snug text-text-secondary">
                {card.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
