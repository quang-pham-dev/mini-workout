import {
  SanityContentSourceError,
  createPublishedContentSource,
  publishedClientPolicy,
} from '../src/content/sanity/content-source.js';
import {
  previewArticlesQuery,
  previewCategoriesQuery,
  previewPrimaryNavigationQuery,
  previewSiteSettingsQuery,
  publishedArticlesQuery,
  publishedCategoriesQuery,
  publishedPrimaryNavigationQuery,
  publishedSiteSettingsQuery,
} from '../src/content/sanity/queries.js';
import { describe, expect, it, vi } from 'vitest';

describe('Sanity published-content source', () => {
  it('bypasses CDN so publish-triggered static builds read the live snapshot', () => {
    expect(publishedClientPolicy).toEqual({
      apiVersion: '2026-09-24',
      perspective: 'published',
      useCdn: false,
    });
  });

  it('keeps queries published-only and projects contract-version fields', () => {
    for (const query of [
      publishedArticlesQuery,
      publishedCategoriesQuery,
      publishedSiteSettingsQuery,
      publishedPrimaryNavigationQuery,
    ]) {
      expect(query).toContain('status == "published"');
      expect(query).toContain('schemaVersion');
      expect(query).not.toContain('drafts.');
    }
  });

  it('uses draft-aware queries that preserve the validated mapper contract', () => {
    for (const query of [
      previewArticlesQuery,
      previewCategoriesQuery,
      previewSiteSettingsQuery,
      previewPrimaryNavigationQuery,
    ]) {
      expect(query).not.toContain('status == "published"');
      expect(query).toContain('"status": "published"');
      expect(query).toContain('schemaVersion');
    }
  });

  it('fetches and maps the published site-shell singletons', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce([
        {
          _type: 'siteSettings',
          schemaVersion: 1,
          status: 'published',
          brandName: 'Mini Workout',
          footerTagline: 'Small steps, built to last.',
        },
      ])
      .mockResolvedValueOnce([
        {
          _type: 'primaryNavigation',
          schemaVersion: 1,
          status: 'published',
          links: [{ _key: 'ways', label: 'Ways to move', href: '/#ways' }],
          signInLabel: 'Sign in',
          primaryCtaLabel: 'Build my routine',
        },
      ]);
    const source = createPublishedContentSource({ fetch });

    await expect(source.getSiteShell()).resolves.toMatchObject({
      brandName: 'Mini Workout',
      primaryLinks: [{ key: 'ways', href: '/#ways' }],
    });
    expect(fetch).toHaveBeenNthCalledWith(1, publishedSiteSettingsQuery);
    expect(fetch).toHaveBeenNthCalledWith(2, publishedPrimaryNavigationQuery);
  });

  it('fetches and maps Article and Category documents through existing contracts', async () => {
    const fetch = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const source = createPublishedContentSource({ fetch });

    await expect(source.getArticles()).resolves.toEqual([]);
    await expect(source.getCategories()).resolves.toEqual([]);
    expect(fetch).toHaveBeenNthCalledWith(1, publishedArticlesQuery);
    expect(fetch).toHaveBeenNthCalledWith(2, publishedCategoriesQuery);
  });

  it('normalizes provider failures without leaking provider messages', async () => {
    const source = createPublishedContentSource({
      fetch: vi
        .fn()
        .mockRejectedValue(new Error('token=secret-provider-detail')),
    });

    await expect(source.getArticles()).rejects.toMatchObject({
      name: 'SanityContentSourceError',
      code: 'DEPENDENCY_UNAVAILABLE',
      message: 'Published content is unavailable',
    });
    await expect(source.getArticles()).rejects.not.toThrow(
      'secret-provider-detail',
    );
  });

  it('fails configuration before creating a network client', () => {
    expect(() =>
      createPublishedContentSource({ projectId: '', dataset: '' }),
    ).toThrowError(SanityContentSourceError);
    expect(() =>
      createPublishedContentSource({ projectId: '', dataset: '' }),
    ).toThrow('Sanity published-content configuration is invalid');
  });
});
