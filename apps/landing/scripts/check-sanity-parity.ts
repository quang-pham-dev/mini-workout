import { comparePublishedContentSnapshots } from '../src/content/content-parity.js';
import { createPublishedContentRepository } from '../src/content/published-content-repository.js';
import { SanityContentSourceError } from '../src/content/sanity/content-source.js';
import process from 'node:process';

const projectId = process.env.SANITY_PROJECT_ID?.trim();
const dataset = process.env.SANITY_DATASET?.trim();

if (!projectId || !dataset) {
  console.error(
    'Content parity failed: CONFIG_INVALID (SANITY_PROJECT_ID and SANITY_DATASET are required).',
  );
  process.exitCode = 1;
} else {
  try {
    const [expected, actual] = await Promise.all([
      createPublishedContentRepository({ contentSource: 'fixtures' }).load(),
      createPublishedContentRepository({
        contentSource: 'sanity',
        sanityProjectId: projectId,
        sanityDataset: dataset,
      }).load(),
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
        `Content parity passed: ${actual.categories.length} category route(s), ${actual.articles.length} article route(s).`,
      );
    }
  } catch (error) {
    const code =
      error instanceof SanityContentSourceError
        ? error.code
        : 'CONTENT_INVALID';
    console.error(`Content parity failed: ${code}.`);
    process.exitCode = 1;
  }
}
