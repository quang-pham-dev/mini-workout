import { classifyCampaignLifecycle } from '../content/published-campaign.js';
import type { PublishedContentSnapshot } from '../content/published-content-repository.js';

export type LaunchSurface = 'campaign' | 'pricing';

export interface ContentLaunchReadinessIssue {
  severity: 'error' | 'warning';
  code: 'campaign_ending_soon' | 'campaign_not_active' | 'pricing_missing';
  path: string;
}

const warningWindowMs = 7 * 24 * 60 * 60 * 1_000;
const launchSurfaceOrder: readonly LaunchSurface[] = ['campaign', 'pricing'];

function isLaunchSurface(value: string): value is LaunchSurface {
  return value === 'campaign' || value === 'pricing';
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
  const selected = surfaces ?? launchSurfaceOrder;
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
  if (args.length === 0) return launchSurfaceOrder;
  if (args.some((argument) => !argument.startsWith('--require='))) {
    throw new Error('Launch readiness surfaces are invalid.');
  }
  const values = args.flatMap((argument) =>
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

  return issues.sort(issueOrder);
}
