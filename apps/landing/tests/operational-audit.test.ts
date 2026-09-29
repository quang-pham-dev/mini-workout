import type { PublishedContentSnapshot } from '../src/content/published-content-repository';
import type { LandingExperiment } from '../src/experimentation/experiment-registry';
import {
  type OperationalAuditIssue,
  auditLandingOperations,
} from '../src/operations/operational-audit';
import { describe, expect, it } from 'vitest';

function snapshot(
  overrides: Partial<PublishedContentSnapshot> = {},
): PublishedContentSnapshot {
  return {
    articles: [],
    campaigns: [],
    categories: [],
    pricing: null,
    siteShell: {
      brandName: 'Mini Workout',
      footerTagline: 'Move gently.',
      signInLabel: 'Sign in',
      primaryCtaLabel: 'Start',
      primaryLinks: [{ key: 'home', label: 'Home', href: '/' }],
    },
    ...overrides,
  };
}

function experiment(
  overrides: Partial<LandingExperiment> = {},
): LandingExperiment {
  return {
    schemaVersion: 1,
    id: 'home-cta-aa',
    version: 1,
    mode: 'aa',
    enabled: true,
    owner: 'growth-team',
    hypothesis: 'Instrumentation produces an unbiased split.',
    primaryMetric: 'register-click-rate',
    guardrailMetrics: ['page-load-error-rate'],
    stoppingRule: 'Run for the approved sample and duration.',
    routeTemplates: ['/'],
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: '2026-10-01T00:00:00.000Z',
    cleanupAt: '2026-10-08T00:00:00.000Z',
    variants: [
      { id: 'control-a', allocation: 5_000, experienceKey: 'control' },
      { id: 'control-b', allocation: 5_000, experienceKey: 'control' },
    ],
    ...overrides,
  };
}

function audit(
  content: PublishedContentSnapshot,
  experiments: readonly LandingExperiment[] = [],
  now = '2026-09-29T00:00:00.000Z',
): readonly OperationalAuditIssue[] {
  return auditLandingOperations({
    content,
    experiments,
    now: new Date(now),
    campaignWarningDays: 7,
    archiveReviewDays: 30,
    experimentWarningDays: 7,
  });
}

describe('Landing operational audit', () => {
  it('accepts a current snapshot whose internal links resolve', () => {
    expect(audit(snapshot())).toEqual([]);
  });

  it('reports missing internal targets without retaining labels or copy', () => {
    expect(
      audit(
        snapshot({
          siteShell: {
            ...snapshot().siteShell,
            primaryLinks: [
              { key: 'missing', label: 'Private copy', href: '/missing/' },
            ],
          },
        }),
      ),
    ).toEqual([
      {
        severity: 'error',
        code: 'broken_internal_link',
        path: 'siteShell.primaryLinks.missing',
      },
    ]);
  });

  it('reports Campaign expiry windows and stale archives deterministically', () => {
    const campaign = {
      campaignId: 'autumn-2026',
      slug: 'autumn',
      status: 'published' as const,
      title: 'Autumn',
      audienceDescription: 'Adults.',
      startsAt: '2026-09-01T00:00:00.000Z',
      endsAt: '2026-10-01T00:00:00.000Z',
      expiryPolicy: { mode: 'archive' as const },
      sections: [],
      seo: {
        title: 'Autumn',
        description: 'Autumn movement.',
        canonicalPath: '/campaigns/autumn/' as const,
      },
    };

    expect(audit(snapshot({ campaigns: [campaign] }))).toContainEqual({
      severity: 'warning',
      code: 'campaign_expiring_soon',
      path: 'campaigns.autumn',
    });
    expect(
      audit(
        snapshot({ campaigns: [campaign] }),
        [],
        '2026-11-01T00:00:00.000Z',
      ),
    ).toContainEqual({
      severity: 'warning',
      code: 'campaign_archive_stale',
      path: 'campaigns.autumn',
    });
  });

  it('does not report an expiry warning before a Campaign starts', () => {
    const scheduled = {
      campaignId: 'scheduled-2026',
      slug: 'scheduled',
      status: 'published' as const,
      title: 'Scheduled',
      audienceDescription: 'Adults.',
      startsAt: '2026-09-30T00:00:00.000Z',
      endsAt: '2026-10-01T00:00:00.000Z',
      expiryPolicy: { mode: 'archive' as const },
      sections: [],
      seo: {
        title: 'Scheduled',
        description: 'Scheduled movement.',
        canonicalPath: '/campaigns/scheduled/' as const,
      },
    };

    expect(audit(snapshot({ campaigns: [scheduled] }))).toEqual([]);
  });

  it('warns when an enabled experiment approaches its end date', () => {
    expect(audit(snapshot(), [experiment()])).toContainEqual({
      severity: 'warning',
      code: 'experiment_expiring_soon',
      path: 'experiments.home-cta-aa.v1',
    });
  });

  it('reports enabled expiry and overdue experiment cleanup', () => {
    expect(
      audit(snapshot(), [experiment()], '2026-10-09T00:00:00.000Z'),
    ).toEqual([
      {
        severity: 'error',
        code: 'experiment_cleanup_overdue',
        path: 'experiments.home-cta-aa.v1',
      },
      {
        severity: 'error',
        code: 'experiment_expired_enabled',
        path: 'experiments.home-cta-aa.v1',
      },
    ]);
  });

  it('reports a broken Campaign redirect destination', () => {
    const campaign = {
      campaignId: 'autumn-2026',
      slug: 'autumn',
      status: 'published' as const,
      title: 'Autumn',
      audienceDescription: 'Adults.',
      startsAt: '2026-08-01T00:00:00.000Z',
      endsAt: '2026-09-01T00:00:00.000Z',
      expiryPolicy: {
        mode: 'redirect' as const,
        successor: { label: 'Continue', href: '/movement/missing/' },
      },
      sections: [],
      seo: {
        title: 'Autumn',
        description: 'Autumn movement.',
        canonicalPath: '/campaigns/autumn/' as const,
      },
    };

    expect(audit(snapshot({ campaigns: [campaign] }))).toContainEqual({
      severity: 'error',
      code: 'broken_campaign_redirect',
      path: 'campaigns.autumn.expiryPolicy.successor',
    });
  });

  it('warns when authored navigation still points at a Campaign redirect', () => {
    const campaign = {
      campaignId: 'autumn-2026',
      slug: 'autumn',
      status: 'published' as const,
      title: 'Autumn',
      audienceDescription: 'Adults.',
      startsAt: '2026-08-01T00:00:00.000Z',
      endsAt: '2026-09-01T00:00:00.000Z',
      expiryPolicy: {
        mode: 'redirect' as const,
        successor: { label: 'Continue', href: '/' },
      },
      sections: [],
      seo: {
        title: 'Autumn',
        description: 'Autumn movement.',
        canonicalPath: '/campaigns/autumn/' as const,
      },
    };

    expect(
      audit(
        snapshot({
          campaigns: [campaign],
          siteShell: {
            ...snapshot().siteShell,
            primaryLinks: [
              {
                key: 'campaign',
                label: 'Autumn',
                href: '/campaigns/autumn/',
              },
            ],
          },
        }),
      ),
    ).toContainEqual({
      severity: 'warning',
      code: 'redirected_internal_link',
      path: 'siteShell.primaryLinks.campaign',
    });
  });
});
