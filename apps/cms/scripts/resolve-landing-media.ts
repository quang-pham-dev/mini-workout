import { createStrapiImportPlan } from '../src/migration/import-plan';
import { resolveMigrationMedia } from '../src/migration/media-resolver';
import { readFile } from 'node:fs/promises';

async function main(): Promise<void> {
  const manifestPath = process.argv[2];
  const mediaRoot = process.argv[3];
  if (!manifestPath || !mediaRoot) {
    console.error(
      'Media resolution failed: INPUT_INVALID (manifest path and media root required).',
    );
    process.exitCode = 1;
    return;
  }
  try {
    const manifest = JSON.parse(
      await readFile(manifestPath, 'utf8'),
    ) as unknown;
    const report = await resolveMigrationMedia(
      createStrapiImportPlan(manifest),
      mediaRoot,
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.readyToApply) process.exitCode = 2;
  } catch {
    console.error('Media resolution failed: CONTENT_CONTRACT_INVALID.');
    process.exitCode = 1;
  }
}

void main();
