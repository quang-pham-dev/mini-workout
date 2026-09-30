import {
  type PublishedContentSnapshot,
  createPublishedContentRepository,
} from '../src/content/published-content-repository.js';
import { describe, expect, it, vi } from 'vitest';

const sanitySnapshot: PublishedContentSnapshot = {
  articles: [],
  campaigns: [],
  categories: [],
  marketingPages: [],
  pricing: null,
  siteShell: {
    analyticsConsent: null,
    brandName: 'Mini Workout',
    footerTagline: 'Small steps, built to last.',
    primaryLinks: [],
    signInLabel: 'Sign in',
    primaryCtaLabel: 'Build my routine',
  },
};

describe('published content repository activation', () => {
  it('uses local fixtures by default without constructing a Sanity source', async () => {
    const createSanitySource = vi.fn();
    const repository = createPublishedContentRepository(
      { contentSource: 'fixtures' },
      { createSanitySource },
    );

    const snapshot = await repository.load();
    expect(snapshot.categories.map((category) => category.slug)).toEqual([
      'mobility',
    ]);
    expect(snapshot.articles.map((article) => article.slug)).toEqual([
      'a-gentler-way-to-explore-mobility',
    ]);
    expect(snapshot.campaigns).toEqual([]);
    expect(snapshot.marketingPages).toEqual([]);
    expect(snapshot.pricing).toBeNull();
    expect(snapshot.siteShell.brandName).toBe('Mini Workout');
    expect(createSanitySource).not.toHaveBeenCalled();
  });

  it('activates Sanity only with complete non-secret configuration', async () => {
    const load = vi.fn().mockResolvedValue(sanitySnapshot);
    const createSanitySource = vi.fn(() => ({ load }));
    const repository = createPublishedContentRepository(
      {
        contentSource: 'sanity',
        sanityProjectId: 'project123',
        sanityDataset: 'production',
      },
      { createSanitySource },
    );

    await expect(repository.load()).resolves.toBe(sanitySnapshot);
    expect(createSanitySource).toHaveBeenCalledWith({
      projectId: 'project123',
      dataset: 'production',
    });
  });

  it('does not silently fall back when an activated Sanity source fails', async () => {
    const repository = createPublishedContentRepository(
      {
        contentSource: 'sanity',
        sanityProjectId: 'project123',
        sanityDataset: 'production',
      },
      {
        createSanitySource: () => ({
          load: vi.fn().mockRejectedValue(new Error('CMS unavailable')),
        }),
      },
    );

    await expect(repository.load()).rejects.toThrow('CMS unavailable');
  });

  it('activates Strapi only through its isolated snapshot source', async () => {
    const load = vi.fn().mockResolvedValue(sanitySnapshot);
    const createStrapiSource = vi.fn(() => ({ load }));
    const repository = createPublishedContentRepository(
      {
        contentSource: 'strapi',
        strapiApiUrl: 'https://studio.example.com/',
        strapiApiReadToken: 'read-token',
      },
      { createStrapiSource },
    );

    await expect(repository.load()).resolves.toBe(sanitySnapshot);
    expect(createStrapiSource).toHaveBeenCalledWith({
      apiUrl: 'https://studio.example.com/',
      token: 'read-token',
    });
  });
});
