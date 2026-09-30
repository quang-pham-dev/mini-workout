import { previewIntegration } from './preview-integration.mjs';
import { analyticsIntegration } from './analytics-integration.mjs';
import { parseLandingEnv } from './src/lib/env.ts';
import vercel from '@astrojs/vercel';
import tailwind from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';

const dotenvPath = fileURLToPath(new URL('./.env', import.meta.url));
if (existsSync(dotenvPath)) process.loadEnvFile(dotenvPath);

const {
  siteUrl,
  productAppUrl,
  studioUrl,
  indexable,
  output,
  analytics,
  experimentsEnabled,
  contentSource,
} = parseLandingEnv(process.env);
const preview = output === 'preview';

export default defineConfig({
  site: siteUrl,
  output: preview ? 'server' : 'static',
  ...(preview ? { adapter: vercel() } : {}),
  trailingSlash: 'always',
  integrations: [
    previewIntegration(preview, contentSource),
    analyticsIntegration(analytics.enabled),
  ],
  vite: {
    plugins: [tailwind()],
    define: {
      'import.meta.env.LANDING_INDEXABLE': JSON.stringify(indexable),
      'import.meta.env.LANDING_PREVIEW': JSON.stringify(preview),
      'import.meta.env.MEMBER_APP_URL': JSON.stringify(productAppUrl),
      'import.meta.env.SANITY_PROJECT_ID': JSON.stringify(
        process.env.SANITY_PROJECT_ID,
      ),
      'import.meta.env.SANITY_STUDIO_URL': JSON.stringify(studioUrl),
      'import.meta.env.LANDING_ANALYTICS_ENABLED': JSON.stringify(
        analytics.enabled,
      ),
      'import.meta.env.LANDING_EXPERIMENTS_ENABLED':
        JSON.stringify(experimentsEnabled),
      'import.meta.env.LANDING_POSTHOG_KEY': JSON.stringify(analytics.key),
      'import.meta.env.LANDING_POSTHOG_HOST': JSON.stringify(analytics.host),
    },
  },
});
