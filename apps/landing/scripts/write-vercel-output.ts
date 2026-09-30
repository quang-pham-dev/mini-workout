import {
  createVercelBuildOutputConfig,
  parseCampaignRoutingManifest,
} from '../src/features/campaigns/vercel-routing.js';
import { parseLandingEnv } from '../src/lib/env.js';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const env = parseLandingEnv({
  LANDING_ANALYTICS_ENABLED: process.env.LANDING_ANALYTICS_ENABLED,
  LANDING_EXPERIMENTS_ENABLED: process.env.LANDING_EXPERIMENTS_ENABLED,
  LANDING_CONTENT_SOURCE: process.env.LANDING_CONTENT_SOURCE,
  LANDING_INDEXING_ENABLED: process.env.LANDING_INDEXING_ENABLED,
  LANDING_OUTPUT: process.env.LANDING_OUTPUT,
  LANDING_POSTHOG_HOST: process.env.LANDING_POSTHOG_HOST,
  LANDING_POSTHOG_KEY: process.env.LANDING_POSTHOG_KEY,
  LANDING_SITE_URL: process.env.LANDING_SITE_URL,
  MEMBER_APP_URL: process.env.MEMBER_APP_URL,
  SANITY_DATASET: process.env.SANITY_DATASET,
  SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
  STRAPI_API_URL: process.env.STRAPI_API_URL,
  STRAPI_API_READ_TOKEN: process.env.STRAPI_API_READ_TOKEN,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: process.env.VERCEL_URL,
});
if (env.output === 'preview') process.exit(0);

const appRoot = process.cwd();
const manifestPath = resolve(appRoot, '.astro/campaign-routing.json');
const distPath = resolve(appRoot, 'dist');
const outputPath = resolve(appRoot, '.vercel/output');
const staticPath = resolve(outputPath, 'static');

const manifest = parseCampaignRoutingManifest(
  JSON.parse(await readFile(manifestPath, 'utf8')),
);
const config = createVercelBuildOutputConfig(manifest, {
  mode: 'public',
  analytics: env.analytics,
});

await rm(outputPath, { recursive: true, force: true });
await mkdir(outputPath, { recursive: true });
await cp(distPath, staticPath, { recursive: true });
await writeFile(
  resolve(outputPath, 'config.json'),
  `${JSON.stringify(config, null, 2)}\n`,
  'utf8',
);
