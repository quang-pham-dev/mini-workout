import { normalizeLandingSnapshot } from './snapshot-mapper';
import {
  type LandingSnapshotV1,
  parseLandingSnapshotV1,
} from '@mini-workout/contracts';
import type { Core } from '@strapi/strapi';
import { createHash } from 'node:crypto';

export type SnapshotStatus = 'draft' | 'published';

interface DocumentReader {
  findFirst(params: unknown): Promise<unknown>;
  findMany(params: unknown): Promise<unknown[]>;
}

function reader(strapi: Core.Strapi, uid: string): DocumentReader {
  return strapi.documents(uid as never) as unknown as DocumentReader;
}

const editorialMediaPopulate = {
  populate: {
    image: {
      fields: ['url', 'width', 'height'],
    },
  },
};

const articlePopulate = {
  category: { fields: ['slug', 'name'] },
  author: { fields: ['name', 'entityType'] },
  image: editorialMediaPopulate,
  seo: true,
  sections: {
    on: {
      'article.prose-v1': true,
      'article.pull-quote-v1': true,
    },
  },
};

const campaignPopulate = {
  expiryPolicy: { populate: { successor: true } },
  seo: true,
  sections: {
    on: {
      'campaign.hero-v1': {
        populate: { image: editorialMediaPopulate, cta: true },
      },
      'campaign.benefits-v1': { populate: { items: true } },
      'campaign.faq-v1': { populate: { items: true } },
      'campaign.cta-v1': { populate: { cta: true } },
    },
  },
};

const categoryPopulate = {
  backlink: true,
  image: editorialMediaPopulate,
  focuses: true,
  seo: true,
};

const pricingPopulate = {
  plans: {
    populate: {
      billing: true,
      entitlements: true,
      cta: true,
    },
  },
  faq: true,
  seo: true,
};

function snapshotRevision(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 24);
}

export async function createLandingSnapshot(
  strapi: Core.Strapi,
  status: SnapshotStatus,
): Promise<LandingSnapshotV1> {
  const [
    articles,
    campaigns,
    categories,
    pricing,
    marketingPages,
    siteSettings,
    primaryNavigation,
  ] = await Promise.all([
    reader(strapi, 'api::article.article').findMany({
      status,
      sort: ['slug:asc'],
      populate: articlePopulate,
    }),
    reader(strapi, 'api::campaign.campaign').findMany({
      status,
      sort: ['slug:asc'],
      populate: campaignPopulate,
    }),
    reader(strapi, 'api::category.category').findMany({
      status,
      sort: ['slug:asc'],
      populate: categoryPopulate,
    }),
    reader(strapi, 'api::pricing-page.pricing-page').findFirst({
      status,
      populate: pricingPopulate,
    }),
    reader(strapi, 'api::marketing-page.marketing-page').findMany({
      status,
      sort: ['slug:asc'],
      populate: { sections: true, seo: true },
    }),
    reader(strapi, 'api::site-setting.site-setting').findFirst({
      status,
      populate: {
        analyticsConsent: { populate: { privacyLink: true } },
      },
    }),
    reader(strapi, 'api::primary-navigation.primary-navigation').findFirst({
      status,
      populate: { links: true },
    }),
  ]);

  const rawSnapshot = {
    articles,
    campaigns,
    categories,
    pricing,
    marketingPages,
    siteSettings,
    primaryNavigation,
  };
  return parseLandingSnapshotV1({
    ...normalizeLandingSnapshot(rawSnapshot),
    generatedAt: new Date().toISOString(),
    revision: snapshotRevision(rawSnapshot),
  });
}
