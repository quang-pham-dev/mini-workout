import { parseLandingEnv } from '../src/lib/env.js';
import {
  canonicalUrl,
  serializeJsonLd,
  sitemapXml,
} from '../src/lib/seo/index.js';
import { describe, expect, it } from 'vitest';

describe('parseLandingEnv', () => {
  it('provides a safe local-independent default and normalizes a configured origin', () => {
    expect(parseLandingEnv({})).toEqual({
      siteUrl: 'https://example.com/',
      indexable: false,
      contentSource: 'fixtures',
      output: 'static',
    });
    expect(
      parseLandingEnv({ LANDING_SITE_URL: 'https://site.example/' }).siteUrl,
    ).toBe('https://site.example/');
    expect(parseLandingEnv({ LANDING_SITE_URL: 'site.example' }).siteUrl).toBe(
      'https://site.example/',
    );
    expect(
      parseLandingEnv({ VERCEL_URL: 'my-landing.vercel.app' }).siteUrl,
    ).toBe('https://my-landing.vercel.app/');
    expect(
      parseLandingEnv({ VERCEL_PROJECT_PRODUCTION_URL: 'my-site.com' }).siteUrl,
    ).toBe('https://my-site.com/');
  });

  it('requires complete public Sanity configuration before activation', () => {
    expect(
      parseLandingEnv({
        LANDING_CONTENT_SOURCE: 'sanity',
        SANITY_PROJECT_ID: 'project123',
        SANITY_DATASET: 'production',
      }),
    ).toMatchObject({
      contentSource: 'sanity',
      sanityProjectId: 'project123',
      sanityDataset: 'production',
    });
    expect(() => parseLandingEnv({ LANDING_CONTENT_SOURCE: 'sanity' })).toThrow(
      'Sanity content source requires SANITY_PROJECT_ID and SANITY_DATASET.',
    );
    expect(() =>
      parseLandingEnv({ LANDING_CONTENT_SOURCE: 'fallback' }),
    ).toThrow('LANDING_CONTENT_SOURCE must be fixtures or sanity.');
  });

  it('allows crawling only for an explicitly enabled production deployment', () => {
    expect(
      parseLandingEnv({
        VERCEL_ENV: 'production',
        LANDING_INDEXING_ENABLED: 'true',
      }).indexable,
    ).toBe(true);
    expect(
      parseLandingEnv({
        VERCEL_ENV: 'preview',
        LANDING_INDEXING_ENABLED: 'true',
      }).indexable,
    ).toBe(false);
    expect(parseLandingEnv({ VERCEL_ENV: 'production' }).indexable).toBe(false);
  });

  it('accepts only the static or preview output modes', () => {
    expect(parseLandingEnv({ LANDING_OUTPUT: 'preview' }).output).toBe(
      'preview',
    );
    expect(() => parseLandingEnv({ LANDING_OUTPUT: 'hybrid' })).toThrow(
      'LANDING_OUTPUT must be static or preview.',
    );
  });

  it('rejects credentials, non-HTTP protocols, and path-bearing site URLs', () => {
    expect(() =>
      parseLandingEnv({ LANDING_SITE_URL: 'ftp://site.example/' }),
    ).toThrow(
      'LANDING_SITE_URL must be an HTTP(S) origin without credentials or a path.',
    );
    expect(() =>
      parseLandingEnv({ LANDING_SITE_URL: 'https://user:pass@site.example/' }),
    ).toThrow(
      'LANDING_SITE_URL must be an HTTP(S) origin without credentials or a path.',
    );
    expect(() =>
      parseLandingEnv({ LANDING_SITE_URL: 'https://site.example/preview' }),
    ).toThrow(
      'LANDING_SITE_URL must be an HTTP(S) origin without credentials or a path.',
    );
  });
});

describe('canonicalUrl', () => {
  it('resolves normalized public paths against the configured site origin', () => {
    expect(canonicalUrl('/pricing/', 'https://example.com/')).toBe(
      'https://example.com/pricing/',
    );
  });

  it('rejects absolute URLs and query-bearing paths', () => {
    expect(() =>
      canonicalUrl('https://attacker.example/', 'https://example.com'),
    ).toThrow(
      'Canonical paths must be same-site paths without query or hash data.',
    );
    expect(() =>
      canonicalUrl('/pricing?campaign=one', 'https://example.com'),
    ).toThrow(
      'Canonical paths must be same-site paths without query or hash data.',
    );
  });

  it('rejects a site URL that is not an origin', () => {
    expect(() => canonicalUrl('/', 'https://example.com/preview')).toThrow(
      'The landing site URL must be an HTTP(S) origin.',
    );
  });
});

describe('serializeJsonLd', () => {
  it('escapes script-breaking characters while preserving valid JSON', () => {
    const serialized = serializeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: '</script><script>alert("x")</script>',
      description: '\u2028 & \u2029',
    });

    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(serialized)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: '</script><script>alert("x")</script>',
      description: '\u2028 & \u2029',
    });
  });

  it('serializes the schema-owned category CollectionPage shape', () => {
    expect(
      JSON.parse(
        serializeJsonLd({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Mobility',
          description: 'Everyday mobility guidance.',
          url: 'https://example.com/movement/mobility/',
        }),
      ),
    ).toMatchObject({
      '@type': 'CollectionPage',
      name: 'Mobility',
    });
  });
});

describe('sitemapXml', () => {
  it('emits canonical locations for explicitly indexable paths only', () => {
    expect(sitemapXml('https://example.com', ['/', '/pricing/'])).toContain(
      '<loc>https://example.com/pricing/</loc>',
    );
    expect(() =>
      sitemapXml('https://example.com', ['/draft/?preview=1']),
    ).toThrow(
      'Canonical paths must be same-site paths without query or hash data.',
    );
  });

  it('includes the published Mobility category canonical', () => {
    const sitemap = sitemapXml('https://example.com', [
      '/',
      '/movement/mobility/',
    ]);

    expect(sitemap).toContain(
      '<loc>https://example.com/movement/mobility/</loc>',
    );
  });
});
