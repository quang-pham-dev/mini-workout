import {
  classifyReferrer,
  initializeLandingAnalytics,
  routeTemplateForPath,
} from '../src/analytics/landing-analytics';
import { describe, expect, it, vi } from 'vitest';

describe('Landing analytics', () => {
  it.each([
    ['/', '/'],
    ['/articles/a-gentler-way/', '/articles/:slug/'],
    ['/movement/mobility/', '/movement/:slug/'],
    ['/campaigns/september/', '/campaigns/:slug/'],
    ['/pricing/', '/pricing/'],
    ['/private/path/', undefined],
  ])('maps %s to a bounded route template', (path, expected) => {
    expect(routeTemplateForPath(path)).toBe(expected);
  });

  it.each([
    ['', 'direct'],
    ['https://www.google.com/search?q=mobility', 'search'],
    ['https://mini-workout.test/articles/a/', 'internal'],
    ['https://partner.example/path?email=private', 'referral'],
    ['not-a-url', 'unknown'],
  ] as const)(
    'classifies referrer without retaining its URL',
    (referrer, value) => {
      expect(classifyReferrer(referrer, 'mini-workout.test')).toBe(value);
    },
  );

  it('does not load a provider or attach listeners before consent', async () => {
    const loadClient = vi.fn();
    const addEventListener = vi.fn();

    const started = await initializeLandingAnalytics({
      enabled: true,
      hasConsent: () => false,
      loadClient,
      location: new URL('https://mini-workout.test/'),
      referrer: '',
      addEventListener,
    });

    expect(started).toBe(false);
    expect(loadClient).not.toHaveBeenCalled();
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('captures one page view and delegated cross-app CTA clicks', async () => {
    const capture = vi.fn();
    let clickListener: ((event: Event) => void) | undefined;
    const addEventListener = vi.fn((name, listener) => {
      if (name === 'click') clickListener = listener;
    });

    const started = await initializeLandingAnalytics({
      enabled: true,
      hasConsent: () => true,
      loadClient: async () => ({ capture }),
      location: new URL(
        'https://mini-workout.test/articles/mobility/?utm_source=google&utm_campaign=fall%20mobility&utm_medium=https%3A%2F%2Fevil.test%2F%3Ftoken%3Dprivate&email=private',
      ),
      referrer: 'https://www.google.com/search?q=mobility',
      addEventListener,
    });

    const link = {
      dataset: {
        crossAppNavigation: 'true',
        destinationApp: 'member',
        navigationAction: 'register',
        navigationPlacement: 'article-footer',
        analyticsCtaId: 'article-register',
        analyticsExperimentId: 'home-cta-aa.v1',
        analyticsVariantId: 'control-b',
      },
      closest: () => link,
    };
    clickListener?.({ target: link } as unknown as Event);

    expect(started).toBe(true);
    expect(capture).toHaveBeenNthCalledWith(1, 'landing_page_view', {
      route_template: '/articles/:slug/',
      referrer_class: 'search',
      utm_source: 'google',
      utm_campaign: 'fall-mobility',
    });
    expect(capture).toHaveBeenNthCalledWith(2, 'cta_clicked', {
      route_template: '/articles/:slug/',
      cta_id: 'article-register',
      destination_app: 'member',
      action: 'register',
      placement: 'article-footer',
      experiment_id: 'home-cta-aa.v1',
      variant_id: 'control-b',
      referrer_class: 'search',
      utm_source: 'google',
      utm_campaign: 'fall-mobility',
    });
  });

  it('fails closed for disabled config and unsupported routes', async () => {
    const loadClient = vi.fn();

    expect(
      await initializeLandingAnalytics({
        enabled: false,
        hasConsent: () => true,
        loadClient,
        location: new URL('https://mini-workout.test/'),
        referrer: '',
        addEventListener: vi.fn(),
      }),
    ).toBe(false);
    expect(
      await initializeLandingAnalytics({
        enabled: true,
        hasConsent: () => true,
        loadClient,
        location: new URL('https://mini-workout.test/private/path/'),
        referrer: '',
        addEventListener: vi.fn(),
      }),
    ).toBe(false);
    expect(loadClient).not.toHaveBeenCalled();
  });
});
