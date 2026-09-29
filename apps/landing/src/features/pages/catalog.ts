import { mapPublishedMarketingPageDocuments } from '../../content/published-marketing-page.js';
import type { SeoValue } from '../../content/validation-primitives.js';

export interface LegalPageSection {
  type: 'legalSection.v1';
  key: string;
  heading: string;
  paragraphs: readonly string[];
}

export interface MarketingPageViewModel {
  status: 'published';
  template: 'legal.v1';
  slug: string;
  title: string;
  introduction: string;
  effectiveDate: string;
  sections: readonly LegalPageSection[];
  seo: SeoValue<`/${string}/`>;
}

const marketingPageDocuments: readonly unknown[] = [];
const marketingPages = mapPublishedMarketingPageDocuments(
  marketingPageDocuments,
);

export function getPublishedMarketingPages(): readonly MarketingPageViewModel[] {
  return marketingPages;
}

export function getPublishedMarketingPagePaths(): MarketingPageViewModel['seo']['canonicalPath'][] {
  return marketingPages.map((page) => page.seo.canonicalPath);
}
