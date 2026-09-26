import { assertIndexingArtifact } from '../scripts/indexing-artifact.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = new URL('..', import.meta.url).pathname;
const boundaryScript = join(appRoot, 'scripts/check-boundaries.mjs');
const budgetScript = join(appRoot, 'scripts/check-budget.mjs');

function makeFixture(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `mini-workout-${prefix}-`));
}

describe('Astro boundary gate', () => {
  it('accepts local Astro components and type-only app imports', () => {
    const root = makeFixture('landing-boundary-pass');
    mkdirSync(join(root, 'src/pages'), { recursive: true });
    writeFileSync(
      join(root, 'src/pages/index.astro'),
      `---\nimport Layout from '../layouts/Layout.astro';\nimport type { ViewModel } from '../features/model.js';\n---\n<Layout />\n`,
    );

    expect(() =>
      execFileSync(process.execPath, [boundaryScript, '--root', root]),
    ).not.toThrow();
  });

  it.each([
    ['react', `import React from 'react';`],
    ['shared React UI', `import { Button } from '@mini-workout/ui';`],
    ['database runtime', `import db from '@mini-workout/database';`],
    ['workspace source path', `import x from '../../../packages/core/src/x';`],
  ])('rejects %s imports from Astro files', (_label, source) => {
    const root = makeFixture('landing-boundary-fail');
    mkdirSync(join(root, 'src/pages'), { recursive: true });
    writeFileSync(
      join(root, 'src/pages/index.astro'),
      `---\n${source}\n---\n<p>Fixture</p>\n`,
    );

    const result = spawnSync(
      process.execPath,
      [boundaryScript, '--root', root],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Landing Astro boundary violation');
  });
});

describe('static artifact budget gate', () => {
  it('accepts a static artifact below every budget', () => {
    const root = makeFixture('landing-budget-pass');
    mkdirSync(join(root, '_astro'), { recursive: true });
    writeFileSync(join(root, 'index.html'), '<h1>Landing</h1>');
    writeFileSync(join(root, '_astro/site.css'), 'body{color:black}');

    expect(() =>
      execFileSync(process.execPath, [budgetScript, '--root', root]),
    ).not.toThrow();
  });

  it('rejects compressed first-party JavaScript above 120 KB', () => {
    const root = makeFixture('landing-budget-js');
    mkdirSync(join(root, '_astro'), { recursive: true });
    const noisyJavaScript = Array.from(
      { length: 35_000 },
      (_value, index) => `window.v${index}='${index.toString(36)}-${index}';`,
    ).join('\n');
    writeFileSync(join(root, '_astro/app.js'), noisyJavaScript);

    const result = spawnSync(process.execPath, [budgetScript, '--root', root], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('compressed JavaScript');
  });
});

describe('production indexing artifact gate', () => {
  it('accepts a fail-closed artifact with noindex and a site-wide robots disallow', () => {
    const root = makeFixture('landing-indexing-closed');
    writeFileSync(
      join(root, 'index.html'),
      '<link rel="canonical" href="https://landing.example.test/"><meta name="robots" content="noindex, nofollow">',
    );
    writeFileSync(join(root, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    writeFileSync(
      join(root, 'sitemap.xml'),
      '<urlset><url><loc>https://landing.example.test/</loc></url></urlset>',
    );

    expect(() =>
      assertIndexingArtifact({
        indexable: false,
        root,
        siteUrl: 'https://landing.example.test/',
      }),
    ).not.toThrow();
  });

  it('accepts an opted-in production artifact with matching canonical, robots and sitemap origins', () => {
    const root = makeFixture('landing-indexing-open');
    writeFileSync(
      join(root, 'index.html'),
      '<link rel="canonical" href="https://landing.example.test/"><meta name="robots" content="index, follow">',
    );
    writeFileSync(
      join(root, 'robots.txt'),
      'User-agent: *\nAllow: /\nSitemap: https://landing.example.test/sitemap.xml\n',
    );
    writeFileSync(
      join(root, 'sitemap.xml'),
      '<urlset><url><loc>https://landing.example.test/</loc></url></urlset>',
    );

    expect(() =>
      assertIndexingArtifact({
        indexable: true,
        root,
        siteUrl: 'https://landing.example.test/',
      }),
    ).not.toThrow();
  });

  it('rejects an artifact whose crawler mode or canonical origin does not match the build contract', () => {
    const root = makeFixture('landing-indexing-mismatch');
    writeFileSync(
      join(root, 'index.html'),
      '<link rel="canonical" href="https://wrong.example/"><meta name="robots" content="index, follow">',
    );
    writeFileSync(join(root, 'robots.txt'), 'User-agent: *\nAllow: /\n');
    writeFileSync(
      join(root, 'sitemap.xml'),
      '<urlset><url><loc>https://wrong.example/</loc></url></urlset>',
    );

    expect(() =>
      assertIndexingArtifact({
        indexable: false,
        root,
        siteUrl: 'https://landing.example.test/',
      }),
    ).toThrow(/indexing artifact/i);
  });
});
