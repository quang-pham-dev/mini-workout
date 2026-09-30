import { mapPublishedArticleDocuments } from '../content/published-article.js';
import { mapPublishedCampaignDocuments } from '../content/published-campaign.js';
import { mapPublishedCategoryDocuments } from '../content/published-category.js';
import type { PublishedContentSnapshot } from '../content/published-content-repository.js';
import { mapPublishedMarketingPageDocuments } from '../content/published-marketing-page.js';
import { mapPublishedPricingDocuments } from '../content/published-pricing.js';
import { mapPublishedSiteShellDocuments } from '../content/published-site-shell.js';
import { parseLandingMigrationManifestV1 } from '@mini-workout/contracts';

export function createPublishedContentSnapshotFromManifest(
  input: unknown,
): PublishedContentSnapshot {
  const manifest = parseLandingMigrationManifestV1(input);
  return {
    articles: mapPublishedArticleDocuments(manifest.articles),
    campaigns: mapPublishedCampaignDocuments(manifest.campaigns),
    categories: mapPublishedCategoryDocuments(manifest.categories),
    pricing: mapPublishedPricingDocuments(
      manifest.pricing === null ? [] : [manifest.pricing],
    ),
    marketingPages: mapPublishedMarketingPageDocuments(manifest.marketingPages),
    siteShell: mapPublishedSiteShellDocuments(
      [manifest.siteSettings],
      [manifest.primaryNavigation],
    ),
  };
}
