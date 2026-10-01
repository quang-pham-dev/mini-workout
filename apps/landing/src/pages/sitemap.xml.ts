import { publishedContentRepository } from '../content/published-content-repository.js';
import { createIndexablePaths } from '../content/sitemap-paths.js';
import { planCampaignDelivery } from '../features/campaigns/delivery.js';
import { sitemapXml } from '../lib/seo/index.js';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const { articles, campaigns, categories, marketingPages, pricing } =
    await publishedContentRepository.load();
  const campaignPlan = planCampaignDelivery(campaigns, new Date());
  const indexablePaths = createIndexablePaths({
    campaignPaths: campaignPlan.pages.map(
      ({ campaign }) => campaign.seo.canonicalPath,
    ),
    pricingPath: pricing?.seo.canonicalPath ?? null,
    categoryPaths: categories.map((category) => category.seo.canonicalPath),
    articlePaths: articles.map((article) => article.seo.canonicalPath),
    marketingPagePaths: marketingPages.map((page) => page.seo.canonicalPath),
  });
  const body = sitemapXml(
    site?.toString() ?? 'https://example.com/',
    indexablePaths,
  );

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
