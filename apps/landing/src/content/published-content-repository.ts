import { getPublishedArticles } from '../features/articles/catalog.js';
import type { ArticleViewModel } from '../features/articles/catalog.js';
import { getPublishedCampaigns } from '../features/campaigns/catalog.js';
import type { CampaignViewModel } from '../features/campaigns/catalog.js';
import { getPublishedCategories } from '../features/categories/catalog.js';
import type { CategoryViewModel } from '../features/categories/catalog.js';
import { getPublishedMarketingPages } from '../features/pages/catalog.js';
import type { MarketingPageViewModel } from '../features/pages/catalog.js';
import { getPublishedPricing } from '../features/pricing/catalog.js';
import type { PricingViewModel } from '../features/pricing/catalog.js';
import { getPublishedSiteShell } from '../features/site-shell/catalog.js';
import type { SiteShellViewModel } from '../features/site-shell/catalog.js';
import { parseLandingEnv } from '../lib/env.js';
import { getPreviewState } from '../preview/session.js';
import { createPublishedContentSource } from './sanity/content-source.js';

export interface PublishedContentSnapshot {
  articles: readonly ArticleViewModel[];
  campaigns: readonly CampaignViewModel[];
  categories: readonly CategoryViewModel[];
  pricing: PricingViewModel | null;
  marketingPages: readonly MarketingPageViewModel[];
  siteShell: SiteShellViewModel;
}

interface RepositoryConfig {
  contentSource: 'fixtures' | 'sanity';
  sanityProjectId?: string;
  sanityDataset?: string;
}

export interface ContentRepository {
  load: () => Promise<PublishedContentSnapshot>;
}

interface SanitySnapshotSource {
  load: () => Promise<PublishedContentSnapshot>;
}

interface RepositoryDependencies {
  createSanitySource: (config: {
    projectId: string;
    dataset: string;
  }) => SanitySnapshotSource;
}

const defaultDependencies: RepositoryDependencies = {
  createSanitySource: ({ projectId, dataset }) => {
    const source = createPublishedContentSource({ projectId, dataset });
    return {
      load: async () => {
        const [
          articles,
          campaigns,
          categories,
          marketingPages,
          pricing,
          siteShell,
        ] = await Promise.all([
          source.getArticles(),
          source.getCampaigns(),
          source.getCategories(),
          source.getMarketingPages(),
          source.getPricing(),
          source.getSiteShell(),
        ]);
        return {
          articles,
          campaigns,
          categories,
          marketingPages,
          pricing,
          siteShell,
        };
      },
    };
  },
};

export function createPublishedContentRepository(
  config: RepositoryConfig,
  dependencies: RepositoryDependencies = defaultDependencies,
): ContentRepository {
  let snapshotPromise: Promise<PublishedContentSnapshot> | undefined;

  return {
    load: () => {
      snapshotPromise ??=
        config.contentSource === 'fixtures'
          ? Promise.resolve({
              articles: getPublishedArticles(),
              campaigns: getPublishedCampaigns(),
              categories: getPublishedCategories(),
              marketingPages: getPublishedMarketingPages(),
              pricing: getPublishedPricing(),
              siteShell: getPublishedSiteShell(),
            })
          : dependencies
              .createSanitySource({
                projectId: config.sanityProjectId ?? '',
                dataset: config.sanityDataset ?? '',
              })
              .load();
      return snapshotPromise;
    },
  };
}

const landingEnv = parseLandingEnv({
  LANDING_CONTENT_SOURCE: process.env.LANDING_CONTENT_SOURCE,
  LANDING_INDEXING_ENABLED: process.env.LANDING_INDEXING_ENABLED,
  LANDING_SITE_URL: process.env.LANDING_SITE_URL,
  SANITY_DATASET: process.env.SANITY_DATASET,
  SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
  VERCEL_ENV: process.env.VERCEL_ENV,
  LANDING_OUTPUT: process.env.LANDING_OUTPUT,
});

export const publishedContentRepository = createPublishedContentRepository({
  contentSource: landingEnv.contentSource,
  sanityProjectId: landingEnv.sanityProjectId,
  sanityDataset: landingEnv.sanityDataset,
});

const requestRepositories = new WeakMap<Request, ContentRepository>();

export function getContentRepository(request: Request): ContentRepository {
  if (!import.meta.env.LANDING_PREVIEW || !getPreviewState(request).enabled) {
    return publishedContentRepository;
  }
  const existing = requestRepositories.get(request);
  if (existing) return existing;

  const source = createPublishedContentSource({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    token: process.env.SANITY_API_READ_TOKEN,
    studioUrl: process.env.SANITY_STUDIO_URL,
    preview: true,
  });
  let snapshotPromise: Promise<PublishedContentSnapshot> | undefined;
  const repository: ContentRepository = {
    load: () =>
      (snapshotPromise ??= Promise.all([
        source.getArticles(),
        source.getCampaigns(),
        source.getCategories(),
        source.getMarketingPages(),
        source.getPricing(),
        source.getSiteShell(),
      ]).then(
        ([
          articles,
          campaigns,
          categories,
          marketingPages,
          pricing,
          siteShell,
        ]) => ({
          articles,
          campaigns,
          categories,
          marketingPages,
          pricing,
          siteShell,
        }),
      )),
  };
  requestRepositories.set(request, repository);
  return repository;
}
