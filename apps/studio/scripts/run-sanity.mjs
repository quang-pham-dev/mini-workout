import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile('.env');
} catch (error) {
  if (
    !(error instanceof Error) ||
    !('code' in error) ||
    error.code !== 'ENOENT'
  ) {
    throw error;
  }
}

const projectId =
  process.env.SANITY_PROJECT_ID ?? process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_DATASET ?? process.env.SANITY_STUDIO_DATASET;
const previewUrl =
  process.env.LANDING_PREVIEW_URL ?? process.env.SANITY_STUDIO_PREVIEW_URL;
const sanityExecutable = fileURLToPath(
  new URL('../node_modules/sanity/bin/sanity', import.meta.url),
);
const result = spawnSync(
  process.execPath,
  [sanityExecutable, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(projectId ? { SANITY_STUDIO_PROJECT_ID: projectId } : {}),
      ...(dataset ? { SANITY_STUDIO_DATASET: dataset } : {}),
      ...(previewUrl ? { SANITY_STUDIO_PREVIEW_URL: previewUrl } : {}),
    },
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
