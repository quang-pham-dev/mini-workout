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
    });
    expect(
      parseLandingEnv({ LANDING_SITE_URL: 'https://site.example/' }).siteUrl,
    ).toBe('https://site.example/');
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
});
