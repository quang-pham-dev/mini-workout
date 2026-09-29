import type { PublishedContentSnapshot } from '../src/content/published-content-repository.js';
import type { CampaignViewModel } from '../src/features/campaigns/catalog.js';
import type { MarketingPageViewModel } from '../src/features/pages/catalog.js';
import type { PricingViewModel } from '../src/features/pricing/catalog.js';
import {
  assessLandingContentLaunchReadiness,
  parseLaunchSurfaces,
} from '../src/operations/content-launch-readiness.js';
import { describe, expect, it } from 'vitest';

const now = new Date('2026-09-29T00:00:00.000Z');

function campaign(
  overrides: Partial<CampaignViewModel> = {},
): CampaignViewModel {
  return {
    campaignId: 'autumn-2026',
    slug: 'autumn-mobility',
    status: 'published',
    title: 'Autumn mobility',
    audienceDescription: 'Approved audience.',
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: '2026-10-20T00:00:00.000Z',
    expiryPolicy: { mode: 'archive' },
    sections: [],
    seo: {
      title: 'Autumn mobility',
      description: 'Approved campaign.',
      canonicalPath: '/campaigns/autumn-mobility/',
    },
    ...overrides,
  };
}

function pricing(): PricingViewModel {
  return {
    status: 'published',
    title: 'Pricing',
    introduction: 'Approved plans.',
    currencyCode: 'USD',
    currencyMinorUnit: 2,
    locale: 'en-US',
    plans: [
      {
        key: 'monthly',
        planId: 'monthly',
        name: 'Monthly',
        summary: 'Approved plan.',
        amountMinor: 1200,
        billing: { cadence: 'month', interval: 1 },
        entitlements: [{ key: 'library', label: 'Library' }],
        cta: { label: 'Register', action: 'register' },
        recommended: false,
      },
    ],
    faq: [{ key: 'cancel', question: 'Cancel?', answer: 'Approved answer.' }],
    cancellationTerms: 'Approved cancellation terms.',
    refundTerms: 'Approved refund terms.',
    seo: {
      title: 'Pricing',
      description: 'Approved pricing.',
      canonicalPath: '/pricing/',
    },
  };
}

function privacyPage(): MarketingPageViewModel {
  return {
    status: 'published',
    template: 'legal.v1',
    slug: 'privacy',
    title: 'Privacy policy',
    introduction: 'Approved privacy introduction.',
    effectiveDate: '2026-09-29',
    sections: [],
    seo: {
      title: 'Privacy policy',
      description: 'Approved privacy policy.',
      canonicalPath: '/privacy/',
    },
  };
}

const analyticsConsent = {
  heading: 'Privacy choices',
  description: 'Approved consent copy.',
  allowLabel: 'Allow',
  declineLabel: 'Decline',
  manageLabel: 'Privacy choices',
  privacyLink: { label: 'Privacy policy', href: '/privacy/' },
};

function snapshot(
  overrides: Partial<PublishedContentSnapshot> = {},
): PublishedContentSnapshot {
  return {
    articles: [],
    marketingPages: [],
    campaigns: [],
    categories: [],
    pricing: null,
    siteShell: {
      analyticsConsent: null,
      brandName: 'Mini Workout',
      footerTagline: 'Move gently.',
      signInLabel: 'Sign in',
      primaryCtaLabel: 'Start',
      primaryLinks: [{ key: 'home', label: 'Home', href: '/' }],
    },
    ...overrides,
  };
}

describe('Landing content launch readiness', () => {
  it('fails the default gate when Campaign and Pricing content are absent', () => {
    expect(
      assessLandingContentLaunchReadiness({ content: snapshot(), now }),
    ).toEqual([
      {
        severity: 'error',
        code: 'campaign_not_active',
        path: 'campaigns',
      },
      { severity: 'error', code: 'pricing_missing', path: 'pricing' },
    ]);
  });

  it('passes with an active Campaign and validated Pricing singleton', () => {
    expect(
      assessLandingContentLaunchReadiness({
        content: snapshot({ campaigns: [campaign()], pricing: pricing() }),
        now,
      }),
    ).toEqual([]);
  });

  it.each([
    ['scheduled', '2026-10-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'],
    ['expired', '2026-08-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'],
  ])(
    'does not treat a %s Campaign as launch-ready',
    (_label, startsAt, endsAt) => {
      expect(
        assessLandingContentLaunchReadiness({
          content: snapshot({ campaigns: [campaign({ startsAt, endsAt })] }),
          now,
          requiredSurfaces: ['campaign'],
        }),
      ).toEqual([
        {
          severity: 'error',
          code: 'campaign_not_active',
          path: 'campaigns',
        },
      ]);
    },
  );

  it('warns when the active Campaign launch window is nearly over', () => {
    expect(
      assessLandingContentLaunchReadiness({
        content: snapshot({
          campaigns: [campaign({ endsAt: '2026-10-03T00:00:00.000Z' })],
        }),
        now,
        requiredSurfaces: ['campaign'],
      }),
    ).toEqual([
      {
        severity: 'warning',
        code: 'campaign_ending_soon',
        path: 'campaigns.autumn-mobility',
      },
    ]);
  });

  it('can gate Pricing without requiring a Campaign', () => {
    expect(
      assessLandingContentLaunchReadiness({
        content: snapshot({ pricing: pricing() }),
        now,
        requiredSurfaces: ['pricing'],
      }),
    ).toEqual([]);
  });

  it('fails analytics consent readiness for every missing activation gate', () => {
    expect(
      assessLandingContentLaunchReadiness({
        content: snapshot(),
        now,
        requiredSurfaces: ['analytics-consent'],
        analytics: { enabled: false, experimentsEnabled: false },
      }),
    ).toEqual([
      {
        severity: 'error',
        code: 'analytics_disabled',
        path: 'analytics',
      },
      {
        severity: 'error',
        code: 'consent_copy_missing',
        path: 'siteShell.analyticsConsent',
      },
    ]);
  });

  it('requires the consent privacy link to resolve to a published legal page', () => {
    expect(
      assessLandingContentLaunchReadiness({
        content: snapshot({
          siteShell: { ...snapshot().siteShell, analyticsConsent },
        }),
        now,
        requiredSurfaces: ['analytics-consent'],
        analytics: { enabled: true, experimentsEnabled: false },
      }),
    ).toEqual([
      {
        severity: 'error',
        code: 'privacy_page_missing',
        path: 'siteShell.analyticsConsent.privacyLink',
      },
    ]);
  });

  it('passes analytics consent readiness with matching content and safe config', () => {
    expect(
      assessLandingContentLaunchReadiness({
        content: snapshot({
          marketingPages: [privacyPage()],
          siteShell: { ...snapshot().siteShell, analyticsConsent },
        }),
        now,
        requiredSurfaces: ['analytics-consent'],
        analytics: { enabled: true, experimentsEnabled: false },
      }),
    ).toEqual([]);
  });

  it('keeps experiments disabled until a separate brief is approved', () => {
    expect(
      assessLandingContentLaunchReadiness({
        content: snapshot({
          marketingPages: [privacyPage()],
          siteShell: { ...snapshot().siteShell, analyticsConsent },
        }),
        now,
        requiredSurfaces: ['analytics-consent'],
        analytics: { enabled: true, experimentsEnabled: true },
      }),
    ).toEqual([
      {
        severity: 'error',
        code: 'experiments_not_approved',
        path: 'experiments',
      },
    ]);
  });

  it.each([
    [[], ['campaign', 'pricing']],
    [['--require=campaign'], ['campaign']],
    [['--require=pricing,campaign'], ['campaign', 'pricing']],
    [['--require=analytics-consent'], ['analytics-consent']],
  ])('parses launch surfaces from %j', (args, expected) => {
    expect(parseLaunchSurfaces(args)).toEqual(expected);
  });

  it('rejects unsupported or empty launch surface selection', () => {
    expect(() => parseLaunchSurfaces(['--require=article'])).toThrow(
      'Launch readiness surfaces are invalid.',
    );
    expect(() => parseLaunchSurfaces(['--require='])).toThrow(
      'Launch readiness surfaces are invalid.',
    );
  });
});
