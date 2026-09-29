import type { PublishedContentSnapshot } from '../content/published-content-repository.js';
import type { LandingExperiment } from '../experimentation/experiment-registry.js';
import { validateExperimentRegistry } from '../experimentation/experiment-registry.js';
import { planCampaignDelivery } from '../features/campaigns/delivery.js';

export type OperationalAuditIssue = Readonly<{
  severity: 'error' | 'warning';
  code:
    | 'broken_campaign_redirect'
    | 'broken_internal_link'
    | 'campaign_archive_stale'
    | 'campaign_expiring_soon'
    | 'experiment_cleanup_overdue'
    | 'experiment_expired_enabled'
    | 'experiment_expiring_soon'
    | 'redirected_internal_link';
  path: string;
}>;

export type OperationalAuditInput = Readonly<{
  content: PublishedContentSnapshot;
  experiments: readonly LandingExperiment[];
  now: Date;
  campaignWarningDays: number;
  archiveReviewDays: number;
  experimentWarningDays: number;
}>;

const dayMilliseconds = 24 * 60 * 60 * 1_000;

function assertPositiveDays(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function pathWithoutFragment(href: string): string {
  return href.split('#', 1)[0]!;
}

function issueOrder(
  left: OperationalAuditIssue,
  right: OperationalAuditIssue,
): number {
  return (
    left.path.localeCompare(right.path) || left.code.localeCompare(right.code)
  );
}

export function auditLandingOperations(
  input: OperationalAuditInput,
): readonly OperationalAuditIssue[] {
  if (!Number.isFinite(input.now.getTime())) {
    throw new Error('Operational audit requires a valid clock.');
  }
  assertPositiveDays(input.campaignWarningDays, 'Campaign warning days');
  assertPositiveDays(input.archiveReviewDays, 'Archive review days');
  assertPositiveDays(input.experimentWarningDays, 'Experiment warning days');
  const experiments = validateExperimentRegistry(input.experiments);
  const delivery = planCampaignDelivery(input.content.campaigns, input.now);
  const publishedPaths = new Set<string>([
    '/',
    ...input.content.articles.map(({ seo }) => seo.canonicalPath),
    ...input.content.categories.map(({ seo }) => seo.canonicalPath),
    ...input.content.marketingPages.map(({ seo }) => seo.canonicalPath),
    ...delivery.pages.map(({ campaign }) => campaign.seo.canonicalPath),
    ...(input.content.pricing ? [input.content.pricing.seo.canonicalPath] : []),
  ]);
  const redirectPaths = new Set(delivery.redirects.map(({ source }) => source));
  const activeCampaignSlugs = new Set(
    delivery.pages
      .filter(({ lifecycle }) => lifecycle === 'active')
      .map(({ campaign }) => campaign.slug),
  );
  const issues: OperationalAuditIssue[] = [];

  const inspectLink = (href: string, path: string) => {
    const target = pathWithoutFragment(href);
    if (publishedPaths.has(target)) return;
    issues.push(
      redirectPaths.has(target)
        ? { severity: 'warning', code: 'redirected_internal_link', path }
        : { severity: 'error', code: 'broken_internal_link', path },
    );
  };

  for (const link of input.content.siteShell.primaryLinks) {
    inspectLink(link.href, `siteShell.primaryLinks.${link.key}`);
  }
  if (input.content.siteShell.analyticsConsent) {
    inspectLink(
      input.content.siteShell.analyticsConsent.privacyLink.href,
      'siteShell.analyticsConsent.privacyLink',
    );
  }
  for (const category of input.content.categories) {
    inspectLink(category.backlink.href, `categories.${category.slug}.backlink`);
  }
  for (const article of input.content.articles) {
    inspectLink(
      `/movement/${article.categorySlug}/`,
      `articles.${article.slug}.category`,
    );
  }
  for (const redirect of delivery.redirects) {
    if (!publishedPaths.has(pathWithoutFragment(redirect.destination))) {
      const campaign = input.content.campaigns.find(
        ({ seo }) => seo.canonicalPath === redirect.source,
      );
      issues.push({
        severity: 'error',
        code: 'broken_campaign_redirect',
        path: `campaigns.${campaign?.slug ?? 'unknown'}.expiryPolicy.successor`,
      });
    }
  }

  const now = input.now.getTime();
  for (const campaign of input.content.campaigns) {
    const end = Date.parse(campaign.endsAt);
    const remaining = end - now;
    if (
      activeCampaignSlugs.has(campaign.slug) &&
      remaining > 0 &&
      remaining <= input.campaignWarningDays * dayMilliseconds
    ) {
      issues.push({
        severity: 'warning',
        code: 'campaign_expiring_soon',
        path: `campaigns.${campaign.slug}`,
      });
    }
    if (
      campaign.expiryPolicy.mode === 'archive' &&
      now - end > input.archiveReviewDays * dayMilliseconds
    ) {
      issues.push({
        severity: 'warning',
        code: 'campaign_archive_stale',
        path: `campaigns.${campaign.slug}`,
      });
    }
  }

  for (const experiment of experiments) {
    const path = `experiments.${experiment.id}.v${experiment.version}`;
    const end = Date.parse(experiment.endsAt);
    const cleanup = Date.parse(experiment.cleanupAt);
    const remaining = end - now;
    if (
      experiment.enabled &&
      remaining > 0 &&
      remaining <= input.experimentWarningDays * dayMilliseconds
    ) {
      issues.push({
        severity: 'warning',
        code: 'experiment_expiring_soon',
        path,
      });
    }
    if (experiment.enabled && now >= end) {
      issues.push({
        severity: 'error',
        code: 'experiment_expired_enabled',
        path,
      });
    }
    if (now >= cleanup) {
      issues.push({
        severity: 'error',
        code: 'experiment_cleanup_overdue',
        path,
      });
    }
  }

  return issues.sort(issueOrder);
}
