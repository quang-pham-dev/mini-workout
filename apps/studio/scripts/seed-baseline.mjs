import {
  baselineDocumentIds,
  createBaselineDocuments,
  legacyPrivateBaselineDocumentIds,
} from './baseline-manifest.mjs';
import { createReadStream } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getCliClient } from 'sanity/cli';

const isApply = process.argv.includes('--apply');
const token = process.env.SANITY_AUTH_TOKEN?.trim();
if (!token) {
  console.error('Baseline seed failed: CONFIG_INVALID.');
  process.exitCode = 1;
  process.exit();
}
const client = getCliClient({ apiVersion: '2026-09-24' }).withConfig({
  token,
  useCdn: false,
});
const existingDocuments = await client.fetch(
  '*[_id in $ids]{_id, _type, "imageAssetId": image.image.asset._ref}',
  { ids: [...baselineDocumentIds, ...legacyPrivateBaselineDocumentIds] },
);
const existingIds = new Set(
  existingDocuments
    .map(({ _id }) => _id)
    .filter((id) => baselineDocumentIds.includes(id)),
);
const legacyDocuments = new Map(
  existingDocuments.map((document) => [document._id, document]),
);
const missingIds = baselineDocumentIds.filter((id) => !existingIds.has(id));

if (!isApply) {
  console.log(
    `Baseline dry-run: ${existingIds.size} existing, ${missingIds.length} missing. Use --apply to create missing documents.`,
  );
} else if (missingIds.length === 0) {
  console.log('Baseline apply: all documents already exist; no changes made.');
} else {
  try {
    const categoryImageAssetId = existingIds.has(baselineDocumentIds[1])
      ? 'unused-existing-category-image'
      : legacyDocuments.get(legacyPrivateBaselineDocumentIds[1])?.imageAssetId
        ? legacyDocuments.get(legacyPrivateBaselineDocumentIds[1]).imageAssetId
        : (
            await client.assets.upload(
              'image',
              createReadStream(
                fileURLToPath(
                  new URL(
                    '../../landing/public/images/home/mobility-stretch.webp',
                    import.meta.url,
                  ),
                ),
              ),
              { filename: 'mobility-stretch.webp' },
            )
          )._id;
    const articleImageAssetId = existingIds.has(baselineDocumentIds[2])
      ? 'unused-existing-article-image'
      : legacyDocuments.get(legacyPrivateBaselineDocumentIds[2])?.imageAssetId
        ? legacyDocuments.get(legacyPrivateBaselineDocumentIds[2]).imageAssetId
        : (
            await client.assets.upload(
              'image',
              createReadStream(
                fileURLToPath(
                  new URL(
                    '../../landing/public/images/articles/mobility-range.webp',
                    import.meta.url,
                  ),
                ),
              ),
              { filename: 'mobility-range.webp' },
            )
          )._id;

    const documents = createBaselineDocuments({
      articleImageAssetId,
      categoryImageAssetId,
    }).filter(({ _id }) => !existingIds.has(_id));
    let transaction = client.transaction();
    for (const document of documents)
      transaction = transaction.create(document);
    await transaction.commit();
    console.log(`Baseline apply: created ${documents.length} document(s).`);
  } catch {
    console.error('Baseline apply failed: DEPENDENCY_UNAVAILABLE.');
    process.exitCode = 1;
  }
}
