import packageJson from '../package.json';
import { describe, expect, it } from 'vitest';

describe('Studio environment loading', () => {
  it.each(['dev', 'build'] as const)(
    'preloads the app-local env before Sanity %s',
    (scriptName) => {
      expect(packageJson.scripts[scriptName]).toMatch(
        /^node scripts\/run-sanity\.mjs /,
      );
    },
  );

  it('does not depend on an interactive CLI user token for baseline seed', () => {
    expect(packageJson.scripts['seed:baseline']).toBe(
      'node scripts/run-sanity.mjs exec scripts/seed-baseline.mjs',
    );
  });
});
