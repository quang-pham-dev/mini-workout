import { parseLandingEnv } from './src/lib/env.ts';
import tailwind from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';

const dotenvPath = fileURLToPath(new URL('./.env', import.meta.url));
if (existsSync(dotenvPath)) process.loadEnvFile(dotenvPath);

const { siteUrl, indexable } = parseLandingEnv(process.env);

export default defineConfig({
  site: siteUrl,
  output: 'static',
  trailingSlash: 'always',
  integrations: [],
  vite: {
    plugins: [tailwind()],
    define: {
      'import.meta.env.LANDING_INDEXABLE': JSON.stringify(indexable),
    },
  },
});
