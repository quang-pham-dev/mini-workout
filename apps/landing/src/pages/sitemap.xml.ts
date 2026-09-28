import { publishedContentRepository } from '../content/published-content-repository.js';
import { planCampaignDelivery } from '../features/campaigns/delivery.js';
import { sitemapXml } from '../lib/seo/index.js';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const { articles, campaigns, categories } =
    await publishedContentRepository.load();
  const campaignPlan = planCampaignDelivery(campaigns, new Date());
  const indexablePaths = [
    '/',
    ...campaignPlan.pages.map(({ campaign }) => campaign.seo.canonicalPath),
    ...categories.map((category) => category.seo.canonicalPath),
    ...articles.map((article) => article.seo.canonicalPath),
  ] as const;
  const body = sitemapXml(
    site?.toString() ?? 'https://example.com/',
    indexablePaths,
  );

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
