interface SeedImage {
  image: { asset: { _type: 'reference'; _ref: string } };
}

interface SeedDocument {
  _id: string;
  _type: string;
  schemaVersion?: 1;
  status?: 'published';
}

interface SeedCategory extends SeedDocument {
  image: SeedImage;
}

interface SeedArticle extends SeedDocument {
  image: SeedImage;
  category: { _type: 'reference'; _ref: string };
  author: { _type: 'reference'; _ref: string };
}

export const baselineDocumentIds: readonly [
  string,
  string,
  string,
  string,
  string,
];
export const legacyPrivateBaselineDocumentIds: readonly [
  string,
  string,
  string,
];

export function createBaselineDocuments(input: {
  articleImageAssetId: string;
  categoryImageAssetId: string;
}): readonly [SeedDocument, SeedCategory, SeedArticle];
