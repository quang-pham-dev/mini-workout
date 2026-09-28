import type { CampaignSection } from '../../content/campaign-section-registry.js';
import { mapPublishedCampaignDocuments } from '../../content/published-campaign.js';
import type {
  InternalLink,
  SeoValue,
} from '../../content/validation-primitives.js';

export type CampaignExpiryPolicy =
  | Readonly<{ mode: 'gone' | 'archive' }>
  | Readonly<{ mode: 'redirect'; successor: InternalLink }>;

export interface CampaignViewModel {
  campaignId: string;
  slug: string;
  status: 'published';
  title: string;
  audienceDescription: string;
  startsAt: string;
  endsAt: string;
  expiryPolicy: CampaignExpiryPolicy;
  sections: readonly CampaignSection[];
  seo: SeoValue<`/campaigns/${string}/`>;
}

const campaignDocuments: readonly unknown[] = [];
const campaigns = mapPublishedCampaignDocuments(campaignDocuments);

export function getPublishedCampaigns(): readonly CampaignViewModel[] {
  return campaigns;
}
