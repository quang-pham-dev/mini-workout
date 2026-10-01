import { mapPublishedArticleDocuments } from '../published-article.js';
import { mapPublishedCampaignDocuments } from '../published-campaign.js';
import { mapPublishedCategoryDocuments } from '../published-category.js';
import type { PublishedContentSnapshot } from '../published-content-repository.js';
import { mapPublishedMarketingPageDocuments } from '../published-marketing-page.js';
import { mapPublishedPricingDocuments } from '../published-pricing.js';
import { mapPublishedSiteShellDocuments } from '../published-site-shell.js';
import { parseLandingSnapshotV1 } from '@mini-workout/contracts';

type StableErrorCode = 'CONFIG_INVALID' | 'DEPENDENCY_UNAVAILABLE';

export class StrapiContentSourceError extends Error {
  override readonly cause?: unknown;

  constructor(
    readonly code: StableErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'StrapiContentSourceError';
    this.cause = cause;
  }
}

interface ContentSourceOptions {
  apiUrl?: string;
  token?: string;
  preview?: boolean;
  fetch?: typeof globalThis.fetch;
}

function parseApiOrigin(value: string | undefined): URL {
  try {
    const url = new URL(value ?? '');
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error('Invalid Strapi origin');
    }
    return url;
  } catch (cause) {
    throw new StrapiContentSourceError(
      'CONFIG_INVALID',
      'Strapi published-content configuration is invalid',
      cause,
    );
  }
}

function resolveLocalUploadUrls<T>(value: T, apiUrl: URL): T {
  if (Array.isArray(value)) {
    return value.map((item) => resolveLocalUploadUrls(item, apiUrl)) as T;
  }
  if (typeof value !== 'object' || value === null) return value;

  const record = value as Record<string, unknown>;
  const resolved = Object.fromEntries(
    Object.entries(record).map(([key, item]) => {
      if (
        key === 'image' &&
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item)
      ) {
        const image = item as Record<string, unknown>;
        if (
          typeof image.src === 'string' &&
          image.src.startsWith('/uploads/')
        ) {
          return [
            key,
            { ...image, src: new URL(image.src, apiUrl).toString() },
          ];
        }
      }
      return [key, resolveLocalUploadUrls(item, apiUrl)];
    }),
  );
  return resolved as T;
}

export function createStrapiContentSource(options: ContentSourceOptions): {
  load: () => Promise<PublishedContentSnapshot>;
} {
  const apiUrl = parseApiOrigin(options.apiUrl);
  if (!options.token?.trim()) {
    throw new StrapiContentSourceError(
      'CONFIG_INVALID',
      'Strapi published-content configuration is invalid',
    );
  }
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  let snapshotPromise: Promise<PublishedContentSnapshot> | undefined;

  const load = async (): Promise<PublishedContentSnapshot> => {
    const endpoint = new URL(
      options.preview
        ? '/api/landing/v1/preview-snapshot'
        : '/api/landing/v1/snapshot',
      apiUrl,
    );
    let response: Response;
    try {
      response = await fetchImplementation(endpoint, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${options.token}`,
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (cause) {
      throw new StrapiContentSourceError(
        'DEPENDENCY_UNAVAILABLE',
        'Published content is unavailable',
        cause,
      );
    }

    if (!response.ok) {
      throw new StrapiContentSourceError(
        'DEPENDENCY_UNAVAILABLE',
        'Published content is unavailable',
      );
    }
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > 10_000_000) {
      throw new StrapiContentSourceError(
        'DEPENDENCY_UNAVAILABLE',
        'Published content exceeded the snapshot size limit',
      );
    }

    try {
      const text = await response.text();
      if (text.length > 10_000_000) {
        throw new StrapiContentSourceError(
          'DEPENDENCY_UNAVAILABLE',
          'Published content exceeded the snapshot size limit',
        );
      }
      const envelope = resolveLocalUploadUrls(
        parseLandingSnapshotV1(JSON.parse(text) as unknown),
        apiUrl,
      );
      return {
        articles: mapPublishedArticleDocuments(envelope.articles),
        campaigns: mapPublishedCampaignDocuments(envelope.campaigns),
        categories: mapPublishedCategoryDocuments(envelope.categories),
        pricing: mapPublishedPricingDocuments(
          envelope.pricing === null ? [] : [envelope.pricing],
        ),
        marketingPages: mapPublishedMarketingPageDocuments(
          envelope.marketingPages,
        ),
        siteShell: mapPublishedSiteShellDocuments(
          [envelope.siteSettings],
          [envelope.primaryNavigation],
        ),
      };
    } catch (cause) {
      if (cause instanceof StrapiContentSourceError) throw cause;
      throw new StrapiContentSourceError(
        'DEPENDENCY_UNAVAILABLE',
        'Published content returned an invalid snapshot',
        cause,
      );
    }
  };

  return {
    load: () => (snapshotPromise ??= load()),
  };
}
