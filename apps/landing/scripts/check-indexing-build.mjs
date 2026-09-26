import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { assertIndexingArtifact } from './indexing-artifact.mjs';

const siteUrl = 'https://landing-indexing.example.test/';
const temporaryRoot = mkdtempSync(join(tmpdir(), 'mini-workout-indexing-'));

function buildAndAssert(name, indexable) {
  const outputRoot = join(temporaryRoot, name);
  const result = spawnSync(
    'pnpm',
    ['exec', 'astro', 'build', '--outDir', outputRoot],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
      env: {
        ...process.env,
        LANDING_CONTENT_SOURCE: 'fixtures',
        LANDING_INDEXING_ENABLED: indexable ? 'true' : 'false',
        LANDING_OUTPUT: 'static',
        LANDING_SITE_URL: siteUrl,
        MEMBER_APP_URL: 'https://members.example.test',
        VERCEL_ENV: 'production',
      },
    },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`Landing ${name} indexing build failed.`);
  }

  assertIndexingArtifact({ indexable, root: outputRoot, siteUrl });
}

try {
  buildAndAssert('fail-closed', false);
  buildAndAssert('production-opt-in', true);
  console.log(
    'Landing indexing build gate passed: fail-closed and production opt-in artifacts are isolated and consistent.',
  );
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
