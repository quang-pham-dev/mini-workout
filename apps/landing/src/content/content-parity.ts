import type { PublishedContentSnapshot } from './published-content-repository.js';

export type ContentParityIssueCode =
  | 'ARTICLE_CANONICAL'
  | 'ARTICLE_INVENTORY'
  | 'ARTICLE_MEDIA_DIMENSIONS'
  | 'ARTICLE_RELATIONSHIP'
  | 'ARTICLE_SECTION_ORDER'
  | 'ARTICLE_SEO'
  | 'CATEGORY_CANONICAL'
  | 'CATEGORY_INVENTORY'
  | 'CATEGORY_MEDIA_DIMENSIONS'
  | 'CATEGORY_SEO'
  | 'PRIMARY_NAVIGATION'
  | 'SITE_SETTINGS';

export interface ContentParityIssue {
  code: ContentParityIssueCode;
  path: string;
}

export interface ContentParityResult {
  ok: boolean;
  issues: readonly ContentParityIssue[];
}

type Article = PublishedContentSnapshot['articles'][number];
type Category = PublishedContentSnapshot['categories'][number];

function equalSeo(
  expected: { title: string; description: string },
  actual: { title: string; description: string },
): boolean {
  return (
    expected.title === actual.title &&
    expected.description === actual.description
  );
}

function equalDimensions(
  expected: { width: number; height: number },
  actual: { width: number; height: number },
): boolean {
  return expected.width === actual.width && expected.height === actual.height;
}

function compareInventory<T extends { slug: string }>(
  kind: 'articles' | 'categories',
  expected: readonly T[],
  actual: readonly T[],
  issues: ContentParityIssue[],
): void {
  const code = kind === 'articles' ? 'ARTICLE_INVENTORY' : 'CATEGORY_INVENTORY';
  const expectedSlugs = new Set(expected.map(({ slug }) => slug));
  const actualSlugs = new Set(actual.map(({ slug }) => slug));

  for (const slug of expectedSlugs) {
    if (!actualSlugs.has(slug)) {
      issues.push({ code, path: `${kind}.${slug}.missing` });
    }
  }
  for (const slug of actualSlugs) {
    if (!expectedSlugs.has(slug)) {
      issues.push({ code, path: `${kind}.${slug}.unexpected` });
    }
  }
}

function compareArticle(
  expected: Article,
  actual: Article,
  issues: ContentParityIssue[],
): void {
  const path = `articles.${expected.slug}`;

  if (expected.seo.canonicalPath !== actual.seo.canonicalPath) {
    issues.push({ code: 'ARTICLE_CANONICAL', path: `${path}.canonical` });
  }
  if (!equalDimensions(expected.image, actual.image)) {
    issues.push({
      code: 'ARTICLE_MEDIA_DIMENSIONS',
      path: `${path}.image.dimensions`,
    });
  }
  if (
    expected.categorySlug !== actual.categorySlug ||
    expected.categoryName !== actual.categoryName
  ) {
    issues.push({ code: 'ARTICLE_RELATIONSHIP', path: `${path}.category` });
  }
  if (
    expected.sections.map(({ key, type }) => `${type}:${key}`).join('|') !==
    actual.sections.map(({ key, type }) => `${type}:${key}`).join('|')
  ) {
    issues.push({ code: 'ARTICLE_SECTION_ORDER', path: `${path}.sections` });
  }
  if (!equalSeo(expected.seo, actual.seo)) {
    issues.push({ code: 'ARTICLE_SEO', path: `${path}.seo` });
  }
}

function compareCategory(
  expected: Category,
  actual: Category,
  issues: ContentParityIssue[],
): void {
  const path = `categories.${expected.slug}`;

  if (expected.seo.canonicalPath !== actual.seo.canonicalPath) {
    issues.push({ code: 'CATEGORY_CANONICAL', path: `${path}.canonical` });
  }
  if (!equalDimensions(expected.image, actual.image)) {
    issues.push({
      code: 'CATEGORY_MEDIA_DIMENSIONS',
      path: `${path}.image.dimensions`,
    });
  }
  if (!equalSeo(expected.seo, actual.seo)) {
    issues.push({ code: 'CATEGORY_SEO', path: `${path}.seo` });
  }
}

export function comparePublishedContentSnapshots(
  expected: PublishedContentSnapshot,
  actual: PublishedContentSnapshot,
): ContentParityResult {
  const issues: ContentParityIssue[] = [];
  if (expected.siteShell.brandName !== actual.siteShell.brandName) {
    issues.push({ code: 'SITE_SETTINGS', path: 'siteShell.brandName' });
  }
  if (expected.siteShell.footerTagline !== actual.siteShell.footerTagline) {
    issues.push({ code: 'SITE_SETTINGS', path: 'siteShell.footerTagline' });
  }
  const serializeLinks = (snapshot: PublishedContentSnapshot) =>
    snapshot.siteShell.primaryLinks
      .map(({ key, label, href }) => `${key}:${label}:${href}`)
      .join('|');
  if (serializeLinks(expected) !== serializeLinks(actual)) {
    issues.push({ code: 'PRIMARY_NAVIGATION', path: 'siteShell.primaryLinks' });
  }
  if (expected.siteShell.signInLabel !== actual.siteShell.signInLabel) {
    issues.push({ code: 'PRIMARY_NAVIGATION', path: 'siteShell.signInLabel' });
  }
  if (expected.siteShell.primaryCtaLabel !== actual.siteShell.primaryCtaLabel) {
    issues.push({
      code: 'PRIMARY_NAVIGATION',
      path: 'siteShell.primaryCtaLabel',
    });
  }
  compareInventory('articles', expected.articles, actual.articles, issues);
  compareInventory(
    'categories',
    expected.categories,
    actual.categories,
    issues,
  );

  const actualArticles = new Map(
    actual.articles.map((article) => [article.slug, article]),
  );
  for (const expectedArticle of expected.articles) {
    const actualArticle = actualArticles.get(expectedArticle.slug);
    if (actualArticle) compareArticle(expectedArticle, actualArticle, issues);
  }

  const actualCategories = new Map(
    actual.categories.map((category) => [category.slug, category]),
  );
  for (const expectedCategory of expected.categories) {
    const actualCategory = actualCategories.get(expectedCategory.slug);
    if (actualCategory)
      compareCategory(expectedCategory, actualCategory, issues);
  }

  issues.sort((left, right) =>
    `${left.path}:${left.code}`.localeCompare(`${right.path}:${right.code}`),
  );
  return { ok: issues.length === 0, issues };
}
