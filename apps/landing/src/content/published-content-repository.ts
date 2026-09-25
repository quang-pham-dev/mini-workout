import { getPublishedArticles } from '../features/articles/catalog.js';
import type { ArticleViewModel } from '../features/articles/catalog.js';
import { getPublishedCategories } from '../features/categories/catalog.js';
import type { CategoryViewModel } from '../features/categories/catalog.js';
import { getPublishedSiteShell } from '../features/site-shell/catalog.js';
import type { SiteShellViewModel } from '../features/site-shell/catalog.js';
import { parseLandingEnv } from '../lib/env.js';
import { getPreviewState } from '../preview/session.js';
import { createPublishedContentSource } from './sanity/content-source.js';

export interface PublishedContentSnapshot {
  articles: readonly ArticleViewModel[];
  categories: readonly CategoryViewModel[];
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
        const [articles, categories, siteShell] = await Promise.all([
          source.getArticles(),
          source.getCategories(),
          source.getSiteShell(),
        ]);
        return { articles, categories, siteShell };
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
              categories: getPublishedCategories(),
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
        source.getCategories(),
        source.getSiteShell(),
      ]).then(([articles, categories, siteShell]) => ({
        articles,
        categories,
        siteShell,
      }))),
  };
  requestRepositories.set(request, repository);
  return repository;
}
