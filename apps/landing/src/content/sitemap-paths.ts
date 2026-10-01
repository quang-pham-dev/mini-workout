export interface SitemapPathInput {
  campaignPaths: readonly string[];
  pricingPath: string | null;
  categoryPaths: readonly string[];
  articlePaths: readonly string[];
  marketingPagePaths: readonly string[];
}

export function createIndexablePaths(
  input: SitemapPathInput,
): readonly string[] {
  return [
    '/',
    ...input.campaignPaths,
    ...(input.pricingPath ? [input.pricingPath] : []),
    ...input.categoryPaths,
    ...input.articlePaths,
    ...input.marketingPagePaths,
  ];
}
