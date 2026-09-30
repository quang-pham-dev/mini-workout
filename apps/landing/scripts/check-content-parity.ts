import {
  ContentParityCommandError,
  resolveContentParityRepositoryConfig,
} from '../src/content/content-parity-command.js';
import { comparePublishedContentSnapshots } from '../src/content/content-parity.js';
import { createPublishedContentRepository } from '../src/content/published-content-repository.js';
import { SanityContentSourceError } from '../src/content/sanity/content-source.js';
import { StrapiContentSourceError } from '../src/content/strapi/content-source.js';
import { createPublishedContentSnapshotFromManifest } from '../src/migration/manifest-snapshot.js';
import { readFile } from 'node:fs/promises';

try {
  const actualConfig = resolveContentParityRepositoryConfig(process.env);
  const baselineManifestPath =
    process.env.LANDING_PARITY_BASELINE_MANIFEST?.trim();
  const [expected, actual] = await Promise.all([
    baselineManifestPath
      ? readFile(baselineManifestPath, 'utf8').then((value) =>
          createPublishedContentSnapshotFromManifest(
            JSON.parse(value) as unknown,
          ),
        )
      : createPublishedContentRepository({ contentSource: 'fixtures' }).load(),
    createPublishedContentRepository(actualConfig).load(),
  ]);
  const result = comparePublishedContentSnapshots(expected, actual);

  if (!result.ok) {
    console.error(`Content parity failed: ${result.issues.length} issue(s).`);
    for (const issue of result.issues) {
      console.error(`${issue.code} ${issue.path}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `Content parity passed (${actualConfig.contentSource}): ${actual.categories.length} category route(s), ${actual.articles.length} article route(s).`,
    );
  }
} catch (error) {
  const code =
    error instanceof ContentParityCommandError ||
    error instanceof SanityContentSourceError ||
    error instanceof StrapiContentSourceError
      ? error.code
      : 'CONTENT_INVALID';
  console.error(`Content parity failed: ${code}.`);
  process.exitCode = 1;
}
