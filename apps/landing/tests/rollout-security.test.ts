import { createVercelBuildOutputConfig } from '../src/features/campaigns/vercel-routing';
import {
  type LandingSecurityPolicyInput,
  createLandingSecurityHeaders,
} from '../src/rollout/security-headers';
import {
  type RolloutObservation,
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
