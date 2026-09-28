import {
  type RolloutObservation,
  parseRolloutHtml,
  parseRolloutSitemap,
  validateRolloutObservations,
} from '../src/rollout/verify-rollout.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function parseBoolean(value: string | undefined, name: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false.`);
}

function parseHttpsOrigin(value: string | undefined): URL {
  if (!value) throw new Error('LANDING_ROLLOUT_URL is required.');
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.origin + '/' !== url.toString() ||
    url.username ||
    url.password
  ) {
    throw new Error('LANDING_ROLLOUT_URL must be an HTTPS origin.');
  }
  return url;
}

function selectedHeaders(response: Response): Readonly<Record<string, string>> {
  const names = [
    'content-security-policy',
    'permissions-policy',
    'referrer-policy',
    'strict-transport-security',
    'x-content-type-options',
  ];
  return Object.fromEntries(
    names.flatMap((name) => {
      const value = response.headers.get(name);
      return value ? [[name, value]] : [];
    }),
  );
}

async function observe(origin: URL, path: string): Promise<RolloutObservation> {
  const response = await fetch(new URL(path, origin), {
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
  const contentType = response.headers.get('content-type') ?? '';
  const html = contentType.includes('text/html') ? await response.text() : '';
  const metadata = parseRolloutHtml(html);
  return {
    path,
    status: response.status,
    canonical: metadata.canonical,
    robots: metadata.robots,
    headers: selectedHeaders(response),
  };
}

const origin = parseHttpsOrigin(process.env.LANDING_ROLLOUT_URL);
const indexable = parseBoolean(
  process.env.LANDING_ROLLOUT_INDEXABLE,
  'LANDING_ROLLOUT_INDEXABLE',
);
const localSitemap = await readFile(resolve('dist/sitemap.xml'), 'utf8');
const expectedSitemap = parseRolloutSitemap(localSitemap);
const deployedSitemapResponse = await fetch(new URL('/sitemap.xml', origin), {
  signal: AbortSignal.timeout(10_000),
});
if (!deployedSitemapResponse.ok) {
  throw new Error('ROLLOUT_SITEMAP_UNAVAILABLE');
}
const deployedSitemap = parseRolloutSitemap(
  await deployedSitemapResponse.text(),
);
if (deployedSitemap.origin !== expectedSitemap.origin) {
  throw new Error('ROLLOUT_SITEMAP_ORIGIN');
}
const observations = await Promise.all(
  expectedSitemap.paths.map((path) => observe(origin, path)),
);
const issues = validateRolloutObservations({
  origin: expectedSitemap.origin,
  indexable,
  expectedPaths: expectedSitemap.paths,
  sitemapPaths: deployedSitemap.paths,
  observations,
});

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`${issue.code}:${issue.path}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Landing rollout check passed (${observations.length} paths).`);
}
