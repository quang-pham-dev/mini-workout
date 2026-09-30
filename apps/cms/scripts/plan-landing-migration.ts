import { createStrapiImportPlan } from '../src/migration/import-plan';
import { readFile } from 'node:fs/promises';

async function main(): Promise<void> {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error(
      'Migration planning failed: INPUT_INVALID (manifest path required).',
    );
    process.exitCode = 1;
    return;
  }
  try {
    const manifest = JSON.parse(
      await readFile(manifestPath, 'utf8'),
    ) as unknown;
    process.stdout.write(
      `${JSON.stringify(createStrapiImportPlan(manifest), null, 2)}\n`,
    );
  } catch {
    console.error('Migration planning failed: CONTENT_CONTRACT_INVALID.');
    process.exitCode = 1;
  }
}

void main();
