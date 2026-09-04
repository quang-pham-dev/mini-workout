import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('CSS foundation graph', () => {
  it('gives each app one design-system foundation and valid UI source scanning', () => {
    const webCss = read('apps/web/src/app/globals.css');
    const storybookCss = read('apps/storybook/src/storybook.css');

    expect(webCss.match(/@import ['"]tailwindcss['"]/g)).toBeNull();
    expect(webCss.split('@mini-workout/design-system').length - 1).toBe(1);
    expect(webCss).toContain('@source "../../../../packages/ui/src"');
    expect(webCss).not.toContain('@mini-workout/ui/styles.css');

    expect(storybookCss.match(/@import ['"]tailwindcss['"]/g)).toBeNull();
    expect(storybookCss.split('@mini-workout/design-system').length - 1).toBe(
      1,
    );
    expect(storybookCss).toContain("@source '../../../packages/ui/src'");
  });

  it('keeps the foundation responsible for Tailwind and shared utilities', () => {
    const globalsCss = read('packages/design-system/globals.css');
    const tokenCss = read('packages/design-system/design-tokens.css');

    expect(globalsCss.match(/@import ['"]tailwindcss['"]/g)).toHaveLength(1);
    expect(tokenCss).not.toContain("@import 'tailwindcss'");
    expect(tokenCss).toContain('--animate-accordion-down');
    expect(tokenCss).toContain('--animate-shimmer');
    expect(tokenCss).toContain('--animate-mobile-menu-in');
  });
});
