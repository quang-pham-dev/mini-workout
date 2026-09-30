import { createPublishedContentRepository } from '../src/content/published-content-repository.js';
import { exportLandingMigrationManifest } from '../src/migration/export-manifest.js';

try {
  const snapshot = await createPublishedContentRepository({
    contentSource: 'fixtures',
  }).load();
  process.stdout.write(
    `${JSON.stringify(exportLandingMigrationManifest({ snapshot }), null, 2)}\n`,
  );
} catch {
  console.error('Migration export failed: CONTENT_INVALID.');
  process.exitCode = 1;
}
