import { classifyCampaignLifecycle } from '../../content/published-campaign.js';
import type { CampaignViewModel } from './catalog.js';

export interface CampaignPageDelivery {
  campaign: CampaignViewModel;
  lifecycle: 'active' | 'archived';
}

export interface CampaignDeliveryPlan {
  pages: readonly CampaignPageDelivery[];
  redirects: readonly Readonly<{
    source: string;
    destination: string;
    statusCode: 308;
  }>[];
  gone: readonly Readonly<{ path: string; statusCode: 410 }>[];
  omittedScheduledSlugs: readonly string[];
}

export function planCampaignDelivery(
  campaigns: readonly CampaignViewModel[],
  now: Date,
): CampaignDeliveryPlan {
  const pages: CampaignPageDelivery[] = [];
  const redirects: CampaignDeliveryPlan['redirects'][number][] = [];
  const gone: CampaignDeliveryPlan['gone'][number][] = [];
  const omittedScheduledSlugs: string[] = [];

  for (const campaign of campaigns) {
    const lifecycle = classifyCampaignLifecycle(campaign, now);
    if (lifecycle === 'scheduled') {
      omittedScheduledSlugs.push(campaign.slug);
      continue;
    }
    if (lifecycle === 'active') {
      pages.push({ campaign, lifecycle });
      continue;
    }
    if (campaign.expiryPolicy.mode === 'archive') {
      pages.push({ campaign, lifecycle: 'archived' });
    } else if (campaign.expiryPolicy.mode === 'redirect') {
      redirects.push({
        source: campaign.seo.canonicalPath,
        destination: campaign.expiryPolicy.successor.href,
        statusCode: 308,
      });
    } else {
      gone.push({ path: campaign.seo.canonicalPath, statusCode: 410 });
    }
  }

  return { pages, redirects, gone, omittedScheduledSlugs };
}
