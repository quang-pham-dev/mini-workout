import { createVercelBuildOutputConfig } from '../src/features/campaigns/vercel-routing';
import {
  type LandingSecurityPolicyInput,
  createLandingSecurityHeaders,
} from '../src/rollout/security-headers';
import {
  type RolloutObservation,
  parseRolloutHtml,
  parseRolloutSitemap,
  rolloutRequestHeaders,
  validateRolloutObservations,
} from '../src/rollout/verify-rollout';
import { describe, expect, it } from 'vitest';

const publicPolicy: LandingSecurityPolicyInput = {
  mode: 'public',
  analytics: { enabled: false, host: 'https://us.i.posthog.com/' },
};

describe('Landing rollout security policy', () => {
  it('emits a strict public policy without inactive vendor origins', () => {
    const headers = createLandingSecurityHeaders(publicPolicy);

    expect(headers['Content-Security-Policy']).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers['Content-Security-Policy']).toContain("connect-src 'self'");
    expect(headers['Content-Security-Policy']).not.toContain('posthog.com');
    expect(headers).toMatchObject({
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000',
    });
  });

  it('allowlists only the configured analytics origin when enabled', () => {
    const headers = createLandingSecurityHeaders({
      ...publicPolicy,
      analytics: { enabled: true, host: 'https://eu.i.posthog.com/' },
    });

    expect(headers['Content-Security-Policy']).toContain(
      "connect-src 'self' https://eu.i.posthog.com",
    );
    expect(headers['Content-Security-Policy']).not.toContain(
      'https://us.i.posthog.com',
    );
  });

  it('allows only the configured Studio origin to frame preview', () => {
    const headers = createLandingSecurityHeaders({
      mode: 'preview',
      studioOrigin: 'https://studio.preview.example/',
      analytics: { enabled: false, host: 'https://us.i.posthog.com/' },
    });

    expect(headers['Content-Security-Policy']).toContain(
      'frame-ancestors https://studio.preview.example',
    );
    expect(headers['X-Frame-Options']).toBeUndefined();
  });

  it('places continuing security headers before terminal campaign routes', () => {
    const config = createVercelBuildOutputConfig(
      {
        version: 1,
        redirects: [],
        gone: [{ path: '/campaigns/finished/', statusCode: 410 }],
      },
      publicPolicy,
    );

    expect(config.routes[0]).toEqual({
      src: '^/.*$',
      headers: createLandingSecurityHeaders(publicPolicy),
      continue: true,
    });
    expect(config.routes[1]).toEqual({
      src: '^/campaigns/finished/?$',
      status: 410,
    });
  });
});

describe('Landing rollout observations', () => {
  const observation: RolloutObservation = {
    path: '/',
    status: 200,
    canonical: 'https://landing.example/',
    robots: 'noindex, nofollow',
    headers: createLandingSecurityHeaders(publicPolicy),
  };

  it('accepts a bounded non-production crawl result', () => {
    expect(
      validateRolloutObservations({
        origin: 'https://landing.example/',
        indexable: false,
        expectedPaths: ['/'],
        sitemapPaths: ['/'],
        observations: [observation],
      }),
    ).toEqual([]);
  });

  it('keeps an optional deployment-protection secret in request headers only', () => {
    expect(rolloutRequestHeaders(undefined)).toEqual({});
    expect(rolloutRequestHeaders('automation-secret')).toEqual({
      'x-vercel-protection-bypass': 'automation-secret',
    });
    expect(() => rolloutRequestHeaders('unsafe\nheader')).toThrow(
      'ROLLOUT_BYPASS_SECRET_INVALID',
    );
  });

  it('parses controlled sitemap and HTML metadata without accepting origin drift', () => {
    expect(
      parseRolloutSitemap(
        '<urlset><url><loc>https://landing.example/</loc></url><url><loc>https://landing.example/movement/mobility/</loc></url></urlset>',
      ),
    ).toEqual({
      origin: 'https://landing.example/',
      paths: ['/', '/movement/mobility/'],
    });
    expect(
      parseRolloutHtml(
        '<meta content="noindex, nofollow" name="robots"><link href="https://landing.example/" rel="canonical">',
      ),
    ).toEqual({
      canonical: 'https://landing.example/',
      robots: 'noindex, nofollow',
    });
    expect(() =>
      parseRolloutSitemap(
        '<urlset><url><loc>https://landing.example/</loc></url><url><loc>https://other.example/path/</loc></url></urlset>',
      ),
    ).toThrow('ROLLOUT_SITEMAP_ORIGIN');
  });

  it('reports stable issue codes for status, canonical and header drift', () => {
    expect(
      validateRolloutObservations({
        origin: 'https://landing.example/',
        indexable: false,
        expectedPaths: ['/'],
        sitemapPaths: [],
        observations: [
          {
            ...observation,
            status: 500,
            canonical: 'https://other.example/',
            robots: 'index, follow',
            headers: {},
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        { code: 'status', path: '/' },
        { code: 'canonical', path: '/' },
        { code: 'robots', path: '/' },
        { code: 'sitemap_missing', path: '/' },
        { code: 'security_headers', path: '/' },
      ]),
    );
  });
});
