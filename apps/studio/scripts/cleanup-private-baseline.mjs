import {
  baselineDocumentIds,
  legacyPrivateBaselineDocumentIds,
} from './baseline-manifest.mjs';
import process from 'node:process';
import { getCliClient } from 'sanity/cli';

const token = process.env.SANITY_AUTH_TOKEN?.trim();
if (!token) {
  console.error('Baseline cleanup failed: CONFIG_INVALID.');
  process.exitCode = 1;
  process.exit();
}

const client = getCliClient({ apiVersion: '2026-09-24' }).withConfig({
  token,
  useCdn: false,
});
const documents = await client.fetch('*[_id in $ids]{_id}', {
  ids: [...baselineDocumentIds, ...legacyPrivateBaselineDocumentIds],
});
const existingIds = new Set(documents.map(({ _id }) => _id));
const hasCompleteReplacement = baselineDocumentIds.every((id) =>
  existingIds.has(id),
);
const legacyIds = legacyPrivateBaselineDocumentIds.filter((id) =>
  existingIds.has(id),
);

if (!process.argv.includes('--apply')) {
  console.log(
    `Baseline cleanup dry-run: ${legacyIds.length} private legacy document(s); replacements ${hasCompleteReplacement ? 'complete' : 'incomplete'}.`,
  );
} else if (!hasCompleteReplacement) {
  console.error('Baseline cleanup failed: REPLACEMENT_INCOMPLETE.');
  process.exitCode = 1;
} else if (legacyIds.length === 0) {
  console.log('Baseline cleanup: no private legacy documents remain.');
} else {
  let transaction = client.transaction();
  for (const id of legacyIds) transaction = transaction.delete(id);
  await transaction.commit();
  console.log(
    `Baseline cleanup: deleted ${legacyIds.length} private legacy document(s); shared assets retained.`,
  );
}
