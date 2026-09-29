import { classifyCampaignLifecycle } from '../content/published-campaign.js';
import type { PublishedContentSnapshot } from '../content/published-content-repository.js';

export type LaunchSurface = 'campaign' | 'pricing' | 'analytics-consent';

export interface ContentLaunchReadinessIssue {
  severity: 'error' | 'warning';
  code:
    | 'analytics_disabled'
    | 'campaign_ending_soon'
    | 'campaign_not_active'
    | 'consent_copy_missing'
    | 'experiments_not_approved'
    | 'pricing_missing'
    | 'privacy_page_missing';
  path: string;
}

const warningWindowMs = 7 * 24 * 60 * 60 * 1_000;
const defaultLaunchSurfaces: readonly LaunchSurface[] = ['campaign', 'pricing'];
const launchSurfaceOrder: readonly LaunchSurface[] = [
  ...defaultLaunchSurfaces,
  'analytics-consent',
];

function isLaunchSurface(value: string): value is LaunchSurface {
  return launchSurfaceOrder.includes(value as LaunchSurface);
}

function issueOrder(
  left: ContentLaunchReadinessIssue,
  right: ContentLaunchReadinessIssue,
): number {
  return (
    left.path.localeCompare(right.path) || left.code.localeCompare(right.code)
  );
}

function normalizeSurfaces(
  surfaces: readonly LaunchSurface[] | undefined,
): readonly LaunchSurface[] {
  const selected = surfaces ?? defaultLaunchSurfaces;
  if (
    selected.length === 0 ||
    selected.some((value) => !launchSurfaceOrder.includes(value))
  ) {
    throw new Error('Launch readiness surfaces are invalid.');
  }
  return launchSurfaceOrder.filter((surface) => selected.includes(surface));
}

export function parseLaunchSurfaces(
  args: readonly string[],
): readonly LaunchSurface[] {
  if (args.length === 0) return defaultLaunchSurfaces;
  const normalizedArgs = args[0] === '--' ? args.slice(1) : args;
  if (
    normalizedArgs.length === 0 ||
    normalizedArgs.some((argument) => !argument.startsWith('--require='))
  ) {
    throw new Error('Launch readiness surfaces are invalid.');
  }
  const values = normalizedArgs.flatMap((argument) =>
    argument.slice('--require='.length).split(','),
  );
  if (values.length === 0 || !values.every(isLaunchSurface)) {
    throw new Error('Launch readiness surfaces are invalid.');
  }
  return normalizeSurfaces(values);
}

export function assessLandingContentLaunchReadiness(
  input: Readonly<{
    content: PublishedContentSnapshot;
    now: Date;
    requiredSurfaces?: readonly LaunchSurface[];
    analytics?: Readonly<{
      enabled: boolean;
      experimentsEnabled: boolean;
    }>;
  }>,
): readonly ContentLaunchReadinessIssue[] {
  const now = input.now.getTime();
  if (!Number.isFinite(now)) {
    throw new Error('Launch readiness requires a valid clock.');
  }
  const requiredSurfaces = normalizeSurfaces(input.requiredSurfaces);
  const issues: ContentLaunchReadinessIssue[] = [];

  if (requiredSurfaces.includes('campaign')) {
    const activeCampaigns = input.content.campaigns.filter(
      (campaign) => classifyCampaignLifecycle(campaign, input.now) === 'active',
    );
    if (activeCampaigns.length === 0) {
      issues.push({
        severity: 'error',
        code: 'campaign_not_active',
        path: 'campaigns',
      });
    }
    for (const campaign of activeCampaigns) {
      const remaining = Date.parse(campaign.endsAt) - now;
      if (remaining > 0 && remaining <= warningWindowMs) {
        issues.push({
          severity: 'warning',
          code: 'campaign_ending_soon',
          path: `campaigns.${campaign.slug}`,
        });
      }
    }
  }

  if (requiredSurfaces.includes('pricing') && input.content.pricing === null) {
    issues.push({
      severity: 'error',
      code: 'pricing_missing',
      path: 'pricing',
    });
  }

  if (requiredSurfaces.includes('analytics-consent')) {
    const analytics = input.analytics ?? {
      enabled: false,
      experimentsEnabled: false,
    };
    const consent = input.content.siteShell.analyticsConsent;

    if (!analytics.enabled) {
      issues.push({
        severity: 'error',
        code: 'analytics_disabled',
        path: 'analytics',
      });
    }
    if (analytics.experimentsEnabled) {
      issues.push({
        severity: 'error',
        code: 'experiments_not_approved',
        path: 'experiments',
      });
    }
    if (!consent) {
      issues.push({
        severity: 'error',
        code: 'consent_copy_missing',
        path: 'siteShell.analyticsConsent',
      });
    } else if (
      !input.content.marketingPages.some(
        (page) =>
          page.template === 'legal.v1' &&
          page.seo.canonicalPath === consent.privacyLink.href,
      )
    ) {
      issues.push({
        severity: 'error',
        code: 'privacy_page_missing',
        path: 'siteShell.analyticsConsent.privacyLink',
      });
    }
  }

  return issues.sort(issueOrder);
}
