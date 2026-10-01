import {
  StrapiContentSourceError,
  createStrapiContentSource,
} from '../src/content/strapi/content-source.js';
import { describe, expect, it, vi } from 'vitest';

const emptySnapshot = {
  schemaVersion: 1,
  generatedAt: '2026-09-30T00:00:00.000Z',
  revision: 'a'.repeat(24),
  articles: [],
  campaigns: [],
  categories: [],
  pricing: {
    _type: 'pricingPage',
    schemaVersion: 1,
    status: 'published',
    title: 'Pricing',
    introduction: 'Choose a plan.',
    currencyCode: 'USD',
    currencyMinorUnit: 2,
    locale: 'en-US',
    plans: [
      {
        _key: 'monthly',
        planId: 'monthly',
        name: 'Monthly',
        summary: 'Monthly access.',
        amountMinor: 1200,
        billing: { cadence: 'month', interval: 1 },
        entitlements: [{ _key: 'library', label: 'Movement library' }],
        cta: { label: 'Join', action: 'register' },
        recommended: true,
      },
    ],
    faq: [{ _key: 'cancel', question: 'Cancel?', answer: 'Any time.' }],
    cancellationTerms: 'Cancel before renewal.',
    refundTerms: 'Refunds follow the published policy.',
    seo: { title: 'Pricing', description: 'Mini Workout pricing.' },
  },
  marketingPages: [],
  siteSettings: {
    _type: 'siteSettings',
    schemaVersion: 1,
    status: 'published',
    brandName: 'Mini Workout',
    footerTagline: 'Small steps, built to last.',
    analyticsConsent: null,
  },
  primaryNavigation: {
    _type: 'primaryNavigation',
    schemaVersion: 1,
    status: 'published',
    links: [{ _key: '1', label: 'Ways to move', href: '/#ways-to-move' }],
    signInLabel: 'Sign in',
    primaryCtaLabel: 'Build my routine',
  },
};

describe('Strapi content source', () => {
  it('fetches and memoizes the published snapshot with a server-only token', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify(emptySnapshot), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    const source = createStrapiContentSource({
      apiUrl: 'https://studio.example.com/',
      token: 'read-token',
      fetch,
    });

    const [first, second] = await Promise.all([source.load(), source.load()]);

    expect(first).toBe(second);
    expect(first.siteShell.brandName).toBe('Mini Workout');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      new URL('https://studio.example.com/api/landing/v1/snapshot'),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer read-token',
        }),
      }),
    );
  });

  it('uses the separately permissioned preview endpoint', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(JSON.stringify(emptySnapshot)));
    const source = createStrapiContentSource({
      apiUrl: 'https://studio.example.com/',
      token: 'preview-token',
      preview: true,
      fetch,
    });

    await source.load();

    expect(fetch.mock.calls[0]?.[0].toString()).toBe(
      'https://studio.example.com/api/landing/v1/preview-snapshot',
    );
  });

  it('resolves Strapi local upload paths against the configured CMS origin', async () => {
    const snapshot = structuredClone({
      ...emptySnapshot,
      articles: [] as unknown[],
    });
    snapshot.articles = [
      {
        _type: 'article',
        schemaVersion: 1,
        status: 'published',
        slug: 'local-upload-test',
        category: { slug: 'mobility', name: 'Mobility' },
        title: 'Local upload test',
        dek: 'A local CMS media URL.',
        author: { name: 'Mini Workout', type: 'Organization' },
        image: {
          src: '/uploads/mobility.webp',
          alt: 'A mobility pose.',
          width: 1200,
          height: 800,
          caption: 'Move gently.',
        },
        sections: [
          {
            _key: 'intro',
            _type: 'prose.v1',
            heading: 'Start gently',
            paragraphs: ['Move within your comfortable range.'],
          },
        ],
        seo: { title: 'Mobility', description: 'Move gently.' },
      },
    ];
    const source = createStrapiContentSource({
      apiUrl: 'http://127.0.0.1:1337/',
      token: 'read-token',
      fetch: vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(JSON.stringify(snapshot))),
    });

    const actual = await source.load();

    expect(actual.articles[0]?.image.src).toBe(
      'http://127.0.0.1:1337/uploads/mobility.webp',
    );
  });

  it('fails closed for missing configuration and invalid upstream data', async () => {
    expect(() => createStrapiContentSource({})).toThrowError(
      StrapiContentSourceError,
    );
    const source = createStrapiContentSource({
      apiUrl: 'https://studio.example.com/',
      token: 'read-token',
      fetch: vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(JSON.stringify({ schemaVersion: 2 }))),
    });

    await expect(source.load()).rejects.toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
    });
  });
});
