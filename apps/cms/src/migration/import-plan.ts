import {
  type LandingMigrationManifestV1,
  parseLandingMigrationManifestV1,
} from '@mini-workout/contracts';
import { createHash } from 'node:crypto';

export type MigrationOperationKind =
  | 'author'
  | 'category'
  | 'media'
  | 'article'
  | 'campaign'
  | 'marketing-page'
  | 'pricing-page'
  | 'site-settings'
  | 'primary-navigation';

export interface MigrationImportOperation {
  readonly phase: 1 | 2 | 3 | 4;
  readonly kind: MigrationOperationKind;
  readonly key: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly references: readonly string[];
}

export interface MigrationBlocker {
  readonly code: 'MEDIA_BINARY_REQUIRED' | 'REQUIRED_PRICING_MISSING';
  readonly path: string;
}

export interface MigrationImportPlan {
  readonly schemaVersion: 1;
  readonly sourceRevision: string;
  readonly planRevision: string;
  readonly readyToApply: boolean;
  readonly operations: readonly MigrationImportOperation[];
  readonly blockers: readonly MigrationBlocker[];
}

function record(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function string(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function uniqueRecords(
  values: readonly Record<string, unknown>[],
  key: string,
): Record<string, unknown>[] {
  return [
    ...new Map(values.map((value) => [string(value[key], ''), value])).values(),
  ]
    .filter((value) => string(value[key], '').length > 0)
    .sort((left, right) =>
      string(left[key], '').localeCompare(string(right[key], '')),
    );
}

function findMedia(
  value: unknown,
  found = new Map<string, Record<string, unknown>>(),
) {
  if (Array.isArray(value)) {
    for (const item of value) findMedia(item, found);
    return found;
  }
  if (!value || typeof value !== 'object') return found;
  const candidate = record(value);
  if (
    typeof candidate.src === 'string' &&
    typeof candidate.alt === 'string' &&
    Number.isInteger(candidate.width) &&
    Number.isInteger(candidate.height)
  ) {
    found.set(candidate.src, candidate);
  }
  for (const child of Object.values(candidate)) findMedia(child, found);
  return found;
}

function operation(
  phase: 1 | 2 | 3 | 4,
  kind: MigrationOperationKind,
  key: string,
  payload: Record<string, unknown>,
  references: readonly string[] = [],
): MigrationImportOperation {
  return { phase, kind, key, payload, references: [...references].sort() };
}

function revision(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function createStrapiImportPlan(
  input: LandingMigrationManifestV1 | unknown,
): MigrationImportPlan {
  const manifest = parseLandingMigrationManifestV1(input);
  const articles = manifest.articles.map(record);
  const categories = manifest.categories.map(record);
  const authors = uniqueRecords(
    articles.map((article) => record(article.author)),
    'name',
  );
  const media = [...findMedia(manifest).values()].sort((left, right) =>
    string(left.src, '').localeCompare(string(right.src, '')),
  );

  const operations: MigrationImportOperation[] = [
    ...authors.map((author) =>
      operation(1, 'author', string(author.name, ''), author),
    ),
    ...media.map((asset) =>
      operation(1, 'media', string(asset.src, ''), asset),
    ),
    ...categories.map((category) =>
      operation(2, 'category', string(category.slug, ''), category, [
        `media:${string(record(category.image).src, '')}`,
      ]),
    ),
    ...articles.map((article) =>
      operation(3, 'article', string(article.slug, ''), article, [
        `author:${string(record(article.author).name, '')}`,
        `category:${string(record(article.category).slug, '')}`,
        `media:${string(record(article.image).src, '')}`,
      ]),
    ),
    ...manifest.campaigns
      .map(record)
      .map((campaign) =>
        operation(3, 'campaign', string(campaign.slug, ''), campaign),
      ),
    ...manifest.marketingPages
      .map(record)
      .map((page) =>
        operation(3, 'marketing-page', string(page.slug, ''), page),
      ),
    ...(manifest.pricing
      ? [operation(4, 'pricing-page', 'pricing', record(manifest.pricing))]
      : []),
    operation(
      4,
      'site-settings',
      'site-settings',
      record(manifest.siteSettings),
    ),
    operation(
      4,
      'primary-navigation',
      'primary-navigation',
      record(manifest.primaryNavigation),
    ),
  ].sort((left, right) =>
    left.phase === right.phase
      ? `${left.kind}:${left.key}`.localeCompare(`${right.kind}:${right.key}`)
      : left.phase - right.phase,
  );

  const blockers: MigrationBlocker[] = [
    ...(manifest.pricing
      ? []
      : [{ code: 'REQUIRED_PRICING_MISSING' as const, path: 'pricing' }]),
    ...media.map((asset) => ({
      code: 'MEDIA_BINARY_REQUIRED' as const,
      path: string(asset.src, ''),
    })),
  ];
  const planCore = {
    schemaVersion: 1 as const,
    sourceRevision: manifest.source.revision,
    operations,
    blockers,
  };
  return {
    ...planCore,
    planRevision: revision(planCore),
    readyToApply: blockers.length === 0,
  };
}
