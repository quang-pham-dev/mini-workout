export const articleSectionKinds = ['prose.v1', 'pullQuote.v1'] as const;

export type ArticleSectionKind = (typeof articleSectionKinds)[number];

export interface ArticleProseSection {
  type: 'prose.v1';
  key: string;
  heading: string;
  paragraphs: readonly string[];
}

export interface ArticlePullQuoteSection {
  type: 'pullQuote.v1';
  key: string;
  quote: string;
}

export type ArticleSection = ArticleProseSection | ArticlePullQuoteSection;

export function isArticleSectionKind(
  value: unknown,
): value is ArticleSectionKind {
  return articleSectionKinds.some((kind) => kind === value);
}

export function assertNever(value: never): never {
  throw new Error(`Unregistered Article section: ${String(value)}`);
}
