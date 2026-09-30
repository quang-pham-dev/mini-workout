import { z } from 'zod';

export const publishedDocumentSchema = <T extends string>(type: T) =>
  z
    .object({
      _type: z.literal(type),
      schemaVersion: z.literal(1),
      status: z.literal('published'),
    })
    .passthrough();

export const landingSnapshotV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.iso.datetime({ offset: true }),
    revision: z.string().regex(/^[a-f0-9]{24}$/),
    articles: z.array(publishedDocumentSchema('article')),
    campaigns: z.array(publishedDocumentSchema('campaignPage')),
    categories: z.array(publishedDocumentSchema('category')),
    pricing: publishedDocumentSchema('pricingPage'),
    marketingPages: z.array(publishedDocumentSchema('marketingPage')),
    siteSettings: publishedDocumentSchema('siteSettings'),
    primaryNavigation: publishedDocumentSchema('primaryNavigation'),
  })
  .strict();

export type LandingSnapshotV1 = z.infer<typeof landingSnapshotV1Schema>;

export function parseLandingSnapshotV1(value: unknown): LandingSnapshotV1 {
  return landingSnapshotV1Schema.parse(value);
}
