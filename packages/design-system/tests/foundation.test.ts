import { semanticTokens } from '../src/tokens';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const tokenCss = read('packages/design-system/design-tokens.css');
const lightCss = read('packages/design-system/theme-light.css');
const darkCss = read('packages/design-system/theme-dark.css');
const globalsCss = read('packages/design-system/globals.css');
const uiSource = read('packages/ui/src/index.ts');
const uiSources = [
  uiSource,
  read('packages/ui/src/components/accordion/accordion.tsx'),
];

const compatibilityColors = [
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'input',
  'ring',
  'ring-offset',
] as const;

const declaredVariables = (source: string, selector?: string) => {
  const body = selector
    ? (source.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '')
    : source;
  return new Set(
    [...body.matchAll(/--([\w-]+)\s*:/g)].map(([, variable]) => variable),
  );
};

describe('design-system foundation contract', () => {
  it('maps every TypeScript semantic color to a CSS variable', () => {
    const cssVariables = declaredVariables(
      `${tokenCss}\n${lightCss}\n${darkCss}\n${globalsCss}`,
    );
    const missing = Object.values(semanticTokens.color).filter(
      (token) => !cssVariables.has(`color-${token}`),
    );

    expect(missing).toEqual([]);
  });

  it('keeps Light and Dark semantic role sets identical', () => {
    expect([...declaredVariables(lightCss, ':root')].sort()).toEqual(
      [...declaredVariables(darkCss, '\\.dark')].sort(),
    );
  });

  it('registers every compatibility color in both themes and @theme', () => {
    const themeVariables = declaredVariables(`${tokenCss}\n${globalsCss}`);
    const lightVariables = declaredVariables(lightCss, ':root');
    const darkVariables = declaredVariables(darkCss, '\\.dark');

    for (const color of compatibilityColors) {
      expect(themeVariables).toContain(`color-${color}`);
      expect(lightVariables).toContain(color);
      expect(darkVariables).toContain(color);
    }

    const inlineTheme =
      globalsCss.match(/@theme inline\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    for (const color of compatibilityColors) {
      expect(inlineTheme).toContain(`--color-${color}: var(--${color})`);
    }
  });

  it('defines a keyframe for every named animation', () => {
    const animations = [
      ...tokenCss.matchAll(/--animate-[\w-]+:\s*([\w-]+)/g),
    ].map(([, name]) => name);
    const keyframes = new Set(
      [...tokenCss.matchAll(/@keyframes\s+([\w-]+)/g)].map(([, name]) => name),
    );

    expect(animations.filter((name) => !keyframes.has(name))).toEqual([]);
  });

  it('does not let UI components import global CSS', () => {
    expect(uiSource).not.toContain('@mini-workout/design-system');
    expect(uiSource).not.toContain('.css');
  });

  it('does not let consumers reference undefined public color variables', () => {
    const publicColorNames = new Set(
      [...`${tokenCss}\n${globalsCss}`.matchAll(/--color-([\w-]+)\s*:/g)].map(
        ([, name]) => name,
      ),
    );
    const undefinedVariables = uiSources.flatMap((source) =>
      [...source.matchAll(/var\(--color-([\w-]+)\)/g)]
        .map(([, name]) => name)
        .filter((name) => !publicColorNames.has(name)),
    );

    expect(undefinedVariables).toEqual([]);
  });

  it('preserves selector-only theme variants and reduced-motion behavior', () => {
    expect(tokenCss).toContain(
      '@custom-variant theme-ocean (&:where([data-theme="ocean"], [data-theme="ocean"] *));',
    );
    expect(tokenCss).toContain(
      '@custom-variant theme-forest (&:where([data-theme="forest"], [data-theme="forest"] *));',
    );
    expect(tokenCss).toContain(
      '@custom-variant theme-sunset (&:where([data-theme="sunset"], [data-theme="sunset"] *));',
    );
    expect(globalsCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(
      read('packages/ui/src/components/accordion/accordion.tsx'),
    ).toContain('motion-reduce:transition-none');
  });
});
