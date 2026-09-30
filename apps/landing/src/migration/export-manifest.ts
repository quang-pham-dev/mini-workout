import type { CampaignSection } from '../content/campaign-section-registry.js';
import type { PublishedContentSnapshot } from '../content/published-content-repository.js';
import type { ArticleSection } from '../content/section-registry.js';
import {
  type LandingMigrationManifestV1,
  parseLandingMigrationManifestV1,
} from '@mini-workout/contracts';
import { createHash } from 'node:crypto';

function seo(value: { title: string; description: string }) {
  return { title: value.title, description: value.description };
}

function media(value: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
}) {
  return { ...value };
}

function articleSection(section: ArticleSection) {
  return section.type === 'prose.v1'
    ? {
        _key: section.key,
        _type: section.type,
        heading: section.heading,
        paragraphs: [...section.paragraphs],
      }
    : { _key: section.key, _type: section.type, quote: section.quote };
}

function campaignSection(section: CampaignSection) {
  switch (section.type) {
    case 'campaignHero.v1':
      return {
        _key: section.key,
        _type: section.type,
        eyebrow: section.eyebrow,
        headline: section.headline,
        introduction: section.introduction,
        image: media(section.image),
        cta: { ...section.cta },
      };
    case 'campaignBenefits.v1':
    case 'campaignFaq.v1':
      return {
        _key: section.key,
        _type: section.type,
        heading: section.heading,
        items: section.items.map((item) => ({ _key: item.key, ...item })),
      };
    case 'campaignCta.v1':
      return {
        _key: section.key,
        _type: section.type,
        heading: section.heading,
        copy: section.copy,
        cta: { ...section.cta },
      };
  }
}

function manifestRevision(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function exportLandingMigrationManifest(input: {
  snapshot: PublishedContentSnapshot;
  generatedAt?: string;
  source?: 'fixtures' | 'sanity';
  sourceRevision?: string;
}): LandingMigrationManifestV1 {
  const { snapshot } = input;
  const content = {
    articles: snapshot.articles.map((article) => ({
      _type: 'article' as const,
      schemaVersion: 1 as const,
      status: 'published' as const,
      slug: article.slug,
      category: { slug: article.categorySlug, name: article.categoryName },
      title: article.title,
      dek: article.dek,
      author: { ...article.author },
      image: media(article.image),
      sections: article.sections.map(articleSection),
      seo: seo(article.seo),
    })),
    campaigns: snapshot.campaigns.map((campaign) => ({
      _type: 'campaignPage' as const,
      schemaVersion: 1 as const,
      status: 'published' as const,
      campaignId: campaign.campaignId,
      slug: campaign.slug,
      title: campaign.title,
      audienceDescription: campaign.audienceDescription,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      expiryPolicy: { ...campaign.expiryPolicy },
      sections: campaign.sections.map(campaignSection),
      seo: seo(campaign.seo),
    })),
    categories: snapshot.categories.map((category) => ({
      _type: 'category' as const,
      schemaVersion: 1 as const,
      status: 'published' as const,
      slug: category.slug,
      name: category.name,
      eyebrow: category.eyebrow,
      headline: category.headline,
      introduction: category.introduction,
      backlink: { ...category.backlink },
      image: media(category.image),
      focusHeading: category.focusHeading,
      focusIntroduction: category.focusIntroduction,
      focuses: category.focuses.map((focus) => ({
        _key: focus.key,
        title: focus.title,
        description: focus.description,
      })),
      closingHeading: category.closingHeading,
      closingCopy: category.closingCopy,
      seo: seo(category.seo),
    })),
    pricing: snapshot.pricing
      ? {
          _type: 'pricingPage' as const,
          schemaVersion: 1 as const,
          status: 'published' as const,
          title: snapshot.pricing.title,
          introduction: snapshot.pricing.introduction,
          currencyCode: snapshot.pricing.currencyCode,
          currencyMinorUnit: snapshot.pricing.currencyMinorUnit,
          locale: snapshot.pricing.locale,
          plans: snapshot.pricing.plans.map((plan) => ({
            ...plan,
            _key: plan.key,
            entitlements: plan.entitlements.map((item) => ({
              _key: item.key,
              label: item.label,
            })),
          })),
          faq: snapshot.pricing.faq.map((item) => ({
            _key: item.key,
            question: item.question,
            answer: item.answer,
          })),
          cancellationTerms: snapshot.pricing.cancellationTerms,
          refundTerms: snapshot.pricing.refundTerms,
          seo: seo(snapshot.pricing.seo),
        }
      : null,
    marketingPages: snapshot.marketingPages.map((page) => ({
      _type: 'marketingPage' as const,
      schemaVersion: 1 as const,
      status: 'published' as const,
      template: page.template,
      slug: page.slug,
      title: page.title,
      introduction: page.introduction,
      effectiveDate: page.effectiveDate,
      sections: page.sections.map((section) => ({
        _key: section.key,
        _type: section.type,
        heading: section.heading,
        paragraphs: [...section.paragraphs],
      })),
      seo: seo(page.seo),
    })),
    siteSettings: {
      _type: 'siteSettings' as const,
      schemaVersion: 1 as const,
      status: 'published' as const,
      brandName: snapshot.siteShell.brandName,
      footerTagline: snapshot.siteShell.footerTagline,
      analyticsConsent: snapshot.siteShell.analyticsConsent,
    },
    primaryNavigation: {
      _type: 'primaryNavigation' as const,
      schemaVersion: 1 as const,
      status: 'published' as const,
      links: snapshot.siteShell.primaryLinks.map((link) => ({
        _key: link.key,
        label: link.label,
        href: link.href,
      })),
      signInLabel: snapshot.siteShell.signInLabel,
      primaryCtaLabel: snapshot.siteShell.primaryCtaLabel,
    },
  };

  return parseLandingMigrationManifestV1({
    schemaVersion: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    source: {
      provider: input.source ?? 'fixtures',
      revision: input.sourceRevision ?? manifestRevision(content),
    },
    ...content,
  });
}
