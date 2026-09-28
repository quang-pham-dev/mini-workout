import type { ArticleViewModel } from '../../features/articles/catalog.js';
import type { CampaignViewModel } from '../../features/campaigns/catalog.js';
import type { CategoryViewModel } from '../../features/categories/catalog.js';
import type { PricingViewModel } from '../../features/pricing/catalog.js';
import type { SiteShellViewModel } from '../../features/site-shell/catalog.js';
import { mapPublishedArticleDocuments } from '../published-article.js';
import { mapPublishedCampaignDocuments } from '../published-campaign.js';
import { mapPublishedCategoryDocuments } from '../published-category.js';
import { mapPublishedPricingDocuments } from '../published-pricing.js';
import { mapPublishedSiteShellDocuments } from '../published-site-shell.js';
import {
  previewArticlesQuery,
  previewCampaignsQuery,
  previewCategoriesQuery,
  previewPricingQuery,
  previewPrimaryNavigationQuery,
  previewSiteSettingsQuery,
  publishedArticlesQuery,
  publishedCampaignsQuery,
  publishedCategoriesQuery,
  publishedPricingQuery,
  publishedPrimaryNavigationQuery,
  publishedSiteSettingsQuery,
} from './queries.js';
import { createClient } from '@sanity/client';

type StableErrorCode = 'CONFIG_INVALID' | 'DEPENDENCY_UNAVAILABLE';

export class SanityContentSourceError extends Error {
  readonly code: StableErrorCode;
  override readonly cause?: unknown;

  constructor(code: StableErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'SanityContentSourceError';
    this.code = code;
    this.cause = cause;
  }
}

interface QueryClient {
  fetch: (query: string) => Promise<unknown>;
}

interface ContentSourceOptions {
  projectId?: string;
  dataset?: string;
  fetch?: QueryClient['fetch'];
  preview?: boolean;
  token?: string;
  studioUrl?: string;
}

export interface PublishedContentSource {
  getArticles: () => Promise<ArticleViewModel[]>;
  getCategories: () => Promise<CategoryViewModel[]>;
  getCampaigns: () => Promise<CampaignViewModel[]>;
  getPricing: () => Promise<PricingViewModel | null>;
  getSiteShell: () => Promise<SiteShellViewModel>;
}

export const publishedClientPolicy = {
  apiVersion: '2026-09-24',
  perspective: 'published',
  useCdn: false,
} as const;

export function createPublishedContentSource(
  options: ContentSourceOptions,
): PublishedContentSource {
  let fetch = options.fetch;
  if (!fetch) {
    if (
      !options.projectId ||
      !options.dataset ||
      (options.preview && !options.token)
    ) {
      throw new SanityContentSourceError(
        'CONFIG_INVALID',
        'Sanity published-content configuration is invalid',
      );
    }
    const client = createClient({
      projectId: options.projectId,
      dataset: options.dataset,
      ...(options.preview
        ? {
            apiVersion: publishedClientPolicy.apiVersion,
            perspective: 'drafts' as const,
            useCdn: false,
            token: options.token,
            stega: {
              enabled: true,
              studioUrl: options.studioUrl ?? 'http://localhost:3333',
            },
          }
        : publishedClientPolicy),
    });
    fetch = client.fetch.bind(client);
  }

  const fetchDocuments = async (query: string): Promise<unknown[]> => {
    try {
      const value = await fetch(query);
      return Array.isArray(value) ? value : [];
    } catch (cause) {
      throw new SanityContentSourceError(
        'DEPENDENCY_UNAVAILABLE',
        'Published content is unavailable',
        cause,
      );
    }
  };

  return {
    getArticles: async () =>
      mapPublishedArticleDocuments(
        await fetchDocuments(
          options.preview ? previewArticlesQuery : publishedArticlesQuery,
        ),
      ),
    getCategories: async () =>
      mapPublishedCategoryDocuments(
        await fetchDocuments(
          options.preview ? previewCategoriesQuery : publishedCategoriesQuery,
        ),
      ),
    getCampaigns: async () =>
      mapPublishedCampaignDocuments(
        await fetchDocuments(
          options.preview ? previewCampaignsQuery : publishedCampaignsQuery,
        ),
      ),
    getPricing: async () =>
      mapPublishedPricingDocuments(
        await fetchDocuments(
          options.preview ? previewPricingQuery : publishedPricingQuery,
        ),
      ),
    getSiteShell: async () => {
      const [settings, navigation] = await Promise.all([
        fetchDocuments(
          options.preview
            ? previewSiteSettingsQuery
            : publishedSiteSettingsQuery,
        ),
        fetchDocuments(
          options.preview
            ? previewPrimaryNavigationQuery
            : publishedPrimaryNavigationQuery,
        ),
      ]);
      return mapPublishedSiteShellDocuments(settings, navigation);
    },
  };
}
