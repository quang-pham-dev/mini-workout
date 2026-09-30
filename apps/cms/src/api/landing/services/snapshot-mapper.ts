type UnknownRecord = Record<string, unknown>;

export class SnapshotMappingError extends Error {
  readonly code = 'CONTENT_CONTRACT_INVALID';

  constructor(
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = 'SnapshotMappingError';
  }
}

function record(value: unknown, path: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SnapshotMappingError(path, `Expected an object at ${path}`);
  }
  return value as UnknownRecord;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new SnapshotMappingError(
      path,
      `Expected a non-empty string at ${path}`,
    );
  }
  return value.trim();
}

function integer(value: unknown, path: string): number {
  if (!Number.isInteger(value)) {
    throw new SnapshotMappingError(path, `Expected an integer at ${path}`);
  }
  return value as number;
}

function componentKey(value: UnknownRecord, path: string): string {
  return string(String(integer(value.id, `${path}.id`)), `${path}.id`);
}

function normalizeSeo(value: unknown, path: string): UnknownRecord {
  const seo = record(value, path);
  return {
    title: string(seo.title, `${path}.title`),
    description: string(seo.description, `${path}.description`),
  };
}

function normalizeMedia(value: unknown, path: string): UnknownRecord {
  const media = record(value, path);
  const asset = record(media.image, `${path}.image`);
  return {
    src: string(asset.url, `${path}.image.url`),
    alt: string(media.alt, `${path}.alt`),
    width: integer(asset.width, `${path}.image.width`),
    height: integer(asset.height, `${path}.image.height`),
    caption: string(media.caption, `${path}.caption`),
  };
}

function normalizeArticleSection(value: unknown, index: number): UnknownRecord {
  const path = `article.sections.${index}`;
  const section = record(value, path);
  const component = string(section.__component, `${path}.__component`);
  const base = { _key: componentKey(section, path) };

  if (component === 'article.pull-quote-v1') {
    return {
      ...base,
      _type: 'pullQuote.v1',
      quote: string(section.quote, `${path}.quote`),
    };
  }
  if (component === 'article.prose-v1') {
    if (!Array.isArray(section.paragraphs) || section.paragraphs.length === 0) {
      throw new SnapshotMappingError(
        `${path}.paragraphs`,
        `Expected at least one paragraph at ${path}.paragraphs`,
      );
    }
    return {
      ...base,
      _type: 'prose.v1',
      heading: string(section.heading, `${path}.heading`),
      paragraphs: section.paragraphs.map((paragraph, paragraphIndex) =>
        string(paragraph, `${path}.paragraphs.${paragraphIndex}`),
      ),
    };
  }
  throw new SnapshotMappingError(
    `${path}.__component`,
    `Unsupported article component ${component}`,
  );
}

function normalizeCta(value: unknown, path: string): UnknownRecord {
  const cta = record(value, path);
  const action = string(cta.action, `${path}.action`);
  if (action !== 'login' && action !== 'register') {
    throw new SnapshotMappingError(
      `${path}.action`,
      `Unsupported CTA action ${action}`,
    );
  }
  return { label: string(cta.label, `${path}.label`), action };
}

function normalizeCampaignItems(
  value: unknown,
  path: string,
  fields: readonly [string, string],
): UnknownRecord[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new SnapshotMappingError(
      path,
      `Expected at least one item at ${path}`,
    );
  }
  return value.map((rawItem, index) => {
    const itemPath = `${path}.${index}`;
    const item = record(rawItem, itemPath);
    return {
      _key: componentKey(item, itemPath),
      [fields[0]]: string(item[fields[0]], `${itemPath}.${fields[0]}`),
      [fields[1]]: string(item[fields[1]], `${itemPath}.${fields[1]}`),
    };
  });
}

function normalizeCampaignSection(
  value: unknown,
  index: number,
): UnknownRecord {
  const path = `campaign.sections.${index}`;
  const section = record(value, path);
  const component = string(section.__component, `${path}.__component`);
  const base = { _key: componentKey(section, path) };

  if (component === 'campaign.hero-v1') {
    return {
      ...base,
      _type: 'campaignHero.v1',
      eyebrow: string(section.eyebrow, `${path}.eyebrow`),
      headline: string(section.headline, `${path}.headline`),
      introduction: string(section.introduction, `${path}.introduction`),
      image: normalizeMedia(section.image, `${path}.image`),
      cta: normalizeCta(section.cta, `${path}.cta`),
    };
  }
  if (component === 'campaign.benefits-v1') {
    return {
      ...base,
      _type: 'campaignBenefits.v1',
      heading: string(section.heading, `${path}.heading`),
      items: normalizeCampaignItems(section.items, `${path}.items`, [
        'title',
        'description',
      ]),
    };
  }
  if (component === 'campaign.faq-v1') {
    return {
      ...base,
      _type: 'campaignFaq.v1',
      heading: string(section.heading, `${path}.heading`),
      items: normalizeCampaignItems(section.items, `${path}.items`, [
        'question',
        'answer',
      ]),
    };
  }
  if (component === 'campaign.cta-v1') {
    return {
      ...base,
      _type: 'campaignCta.v1',
      heading: string(section.heading, `${path}.heading`),
      copy: string(section.copy, `${path}.copy`),
      cta: normalizeCta(section.cta, `${path}.cta`),
    };
  }
  throw new SnapshotMappingError(
    `${path}.__component`,
    `Unsupported campaign component ${component}`,
  );
}

export function normalizeArticleDocument(value: unknown): UnknownRecord {
  const article = record(value, 'article');
  const category = record(article.category, 'article.category');
  const author = record(article.author, 'article.author');
  if (!Array.isArray(article.sections) || article.sections.length === 0) {
    throw new SnapshotMappingError(
      'article.sections',
      'Expected at least one article section',
    );
  }

  return {
    _type: 'article',
    schemaVersion: integer(article.schemaVersion, 'article.schemaVersion'),
    status: 'published',
    slug: string(article.slug, 'article.slug'),
    category: {
      slug: string(category.slug, 'article.category.slug'),
      name: string(category.name, 'article.category.name'),
    },
    title: string(article.title, 'article.title'),
    dek: string(article.dek, 'article.dek'),
    author: {
      name: string(author.name, 'article.author.name'),
      type: string(author.entityType, 'article.author.entityType'),
    },
    image: normalizeMedia(article.image, 'article.image'),
    sections: article.sections.map(normalizeArticleSection),
    seo: normalizeSeo(article.seo, 'article.seo'),
  };
}

export function normalizeCampaignDocument(value: unknown): UnknownRecord {
  const campaign = record(value, 'campaign');
  const expiryPolicy = record(campaign.expiryPolicy, 'campaign.expiryPolicy');
  if (!Array.isArray(campaign.sections) || campaign.sections.length === 0) {
    throw new SnapshotMappingError(
      'campaign.sections',
      'Expected at least one campaign section',
    );
  }

  const mode = string(expiryPolicy.mode, 'campaign.expiryPolicy.mode');
  const normalizedExpiry: UnknownRecord = { mode };
  if (mode === 'redirect') {
    const successor = record(
      expiryPolicy.successor,
      'campaign.expiryPolicy.successor',
    );
    normalizedExpiry.successor = {
      label: string(successor.label, 'campaign.expiryPolicy.successor.label'),
      href: string(successor.href, 'campaign.expiryPolicy.successor.href'),
    };
  }

  return {
    _type: 'campaignPage',
    schemaVersion: integer(campaign.schemaVersion, 'campaign.schemaVersion'),
    status: 'published',
    campaignId: string(campaign.campaignId, 'campaign.campaignId'),
    slug: string(campaign.slug, 'campaign.slug'),
    title: string(campaign.title, 'campaign.title'),
    audienceDescription: string(
      campaign.audienceDescription,
      'campaign.audienceDescription',
    ),
    startsAt: string(campaign.startsAt, 'campaign.startsAt'),
    endsAt: string(campaign.endsAt, 'campaign.endsAt'),
    expiryPolicy: normalizedExpiry,
    sections: campaign.sections.map(normalizeCampaignSection),
    seo: normalizeSeo(campaign.seo, 'campaign.seo'),
  };
}

function normalizeInternalLink(value: unknown, path: string): UnknownRecord {
  const link = record(value, path);
  return {
    label: string(link.label, `${path}.label`),
    href: string(link.href, `${path}.href`),
  };
}

function normalizeKeyedItems(
  value: unknown,
  path: string,
  fields: readonly string[],
): UnknownRecord[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new SnapshotMappingError(
      path,
      `Expected at least one item at ${path}`,
    );
  }
  return value.map((rawItem, index) => {
    const itemPath = `${path}.${index}`;
    const item = record(rawItem, itemPath);
    return Object.fromEntries([
      ['_key', componentKey(item, itemPath)],
      ...fields.map((field) => [
        field,
        string(item[field], `${itemPath}.${field}`),
      ]),
    ]);
  });
}

export function normalizeCategoryDocument(value: unknown): UnknownRecord {
  const category = record(value, 'category');
  return {
    _type: 'category',
    schemaVersion: integer(category.schemaVersion, 'category.schemaVersion'),
    status: 'published',
    slug: string(category.slug, 'category.slug'),
    name: string(category.name, 'category.name'),
    eyebrow: string(category.eyebrow, 'category.eyebrow'),
    headline: string(category.headline, 'category.headline'),
    introduction: string(category.introduction, 'category.introduction'),
    backlink: normalizeInternalLink(category.backlink, 'category.backlink'),
    image: normalizeMedia(category.image, 'category.image'),
    focusHeading: string(category.focusHeading, 'category.focusHeading'),
    focusIntroduction: string(
      category.focusIntroduction,
      'category.focusIntroduction',
    ),
    focuses: normalizeKeyedItems(category.focuses, 'category.focuses', [
      'title',
      'description',
    ]),
    closingHeading: string(category.closingHeading, 'category.closingHeading'),
    closingCopy: string(category.closingCopy, 'category.closingCopy'),
    seo: normalizeSeo(category.seo, 'category.seo'),
  };
}

function normalizeBilling(value: unknown, path: string): UnknownRecord {
  const billing = record(value, path);
  const cadence = string(billing.cadence, `${path}.cadence`);
  if (cadence === 'one_time') return { cadence };
  return {
    cadence,
    interval: integer(billing.interval, `${path}.interval`),
  };
}

function normalizePricingPlan(value: unknown, index: number): UnknownRecord {
  const path = `pricing.plans.${index}`;
  const plan = record(value, path);
  if (typeof plan.recommended !== 'boolean') {
    throw new SnapshotMappingError(
      `${path}.recommended`,
      `Expected a boolean at ${path}.recommended`,
    );
  }
  return {
    _key: componentKey(plan, path),
    planId: string(plan.planId, `${path}.planId`),
    name: string(plan.name, `${path}.name`),
    summary: string(plan.summary, `${path}.summary`),
    amountMinor: integer(plan.amountMinor, `${path}.amountMinor`),
    billing: normalizeBilling(plan.billing, `${path}.billing`),
    entitlements: normalizeKeyedItems(
      plan.entitlements,
      `${path}.entitlements`,
      ['label'],
    ),
    cta: normalizeCta(plan.cta, `${path}.cta`),
    recommended: plan.recommended,
  };
}

export function normalizePricingDocument(value: unknown): UnknownRecord {
  const pricing = record(value, 'pricing');
  if (!Array.isArray(pricing.plans) || pricing.plans.length === 0) {
    throw new SnapshotMappingError(
      'pricing.plans',
      'Expected at least one pricing plan',
    );
  }
  return {
    _type: 'pricingPage',
    schemaVersion: integer(pricing.schemaVersion, 'pricing.schemaVersion'),
    status: 'published',
    title: string(pricing.title, 'pricing.title'),
    introduction: string(pricing.introduction, 'pricing.introduction'),
    currencyCode: string(pricing.currencyCode, 'pricing.currencyCode'),
    currencyMinorUnit: integer(
      pricing.currencyMinorUnit,
      'pricing.currencyMinorUnit',
    ),
    locale: string(pricing.locale, 'pricing.locale'),
    plans: pricing.plans.map(normalizePricingPlan),
    faq: normalizeKeyedItems(pricing.faq, 'pricing.faq', [
      'question',
      'answer',
    ]),
    cancellationTerms: string(
      pricing.cancellationTerms,
      'pricing.cancellationTerms',
    ),
    refundTerms: string(pricing.refundTerms, 'pricing.refundTerms'),
    seo: normalizeSeo(pricing.seo, 'pricing.seo'),
  };
}

export function normalizeMarketingPageDocument(value: unknown): UnknownRecord {
  const page = record(value, 'marketingPage');
  const sections = normalizeKeyedItems(
    page.sections,
    'marketingPage.sections',
    ['heading'],
  ).map((section, index) => {
    const rawSection = record(
      (page.sections as unknown[])[index],
      `marketingPage.sections.${index}`,
    );
    if (
      !Array.isArray(rawSection.paragraphs) ||
      rawSection.paragraphs.length === 0
    ) {
      throw new SnapshotMappingError(
        `marketingPage.sections.${index}.paragraphs`,
        'Expected at least one legal paragraph',
      );
    }
    return {
      ...section,
      _type: 'legalSection.v1',
      paragraphs: rawSection.paragraphs.map((paragraph, paragraphIndex) =>
        string(
          paragraph,
          `marketingPage.sections.${index}.paragraphs.${paragraphIndex}`,
        ),
      ),
    };
  });

  return {
    _type: 'marketingPage',
    schemaVersion: integer(page.schemaVersion, 'marketingPage.schemaVersion'),
    status: 'published',
    template: string(page.template, 'marketingPage.template'),
    slug: string(page.slug, 'marketingPage.slug'),
    title: string(page.title, 'marketingPage.title'),
    introduction: string(page.introduction, 'marketingPage.introduction'),
    effectiveDate: string(page.effectiveDate, 'marketingPage.effectiveDate'),
    sections,
    seo: normalizeSeo(page.seo, 'marketingPage.seo'),
  };
}

export function normalizeSiteSettingsDocument(value: unknown): UnknownRecord {
  const settings = record(value, 'siteSettings');
  let analyticsConsent: UnknownRecord | null = null;
  if (
    settings.analyticsConsent !== null &&
    settings.analyticsConsent !== undefined
  ) {
    const consent = record(
      settings.analyticsConsent,
      'siteSettings.analyticsConsent',
    );
    analyticsConsent = {
      heading: string(consent.heading, 'siteSettings.analyticsConsent.heading'),
      description: string(
        consent.description,
        'siteSettings.analyticsConsent.description',
      ),
      allowLabel: string(
        consent.allowLabel,
        'siteSettings.analyticsConsent.allowLabel',
      ),
      declineLabel: string(
        consent.declineLabel,
        'siteSettings.analyticsConsent.declineLabel',
      ),
      manageLabel: string(
        consent.manageLabel,
        'siteSettings.analyticsConsent.manageLabel',
      ),
      privacyLink: normalizeInternalLink(
        consent.privacyLink,
        'siteSettings.analyticsConsent.privacyLink',
      ),
    };
  }
  return {
    _type: 'siteSettings',
    schemaVersion: integer(
      settings.schemaVersion,
      'siteSettings.schemaVersion',
    ),
    status: 'published',
    brandName: string(settings.brandName, 'siteSettings.brandName'),
    footerTagline: string(settings.footerTagline, 'siteSettings.footerTagline'),
    analyticsConsent,
  };
}

export function normalizeNavigationDocument(value: unknown): UnknownRecord {
  const navigation = record(value, 'primaryNavigation');
  if (!Array.isArray(navigation.links) || navigation.links.length === 0) {
    throw new SnapshotMappingError(
      'primaryNavigation.links',
      'Expected at least one navigation link',
    );
  }
  return {
    _type: 'primaryNavigation',
    schemaVersion: integer(
      navigation.schemaVersion,
      'primaryNavigation.schemaVersion',
    ),
    status: 'published',
    links: navigation.links.map((link, index) => ({
      _key: componentKey(
        record(link, `primaryNavigation.links.${index}`),
        `primaryNavigation.links.${index}`,
      ),
      ...normalizeInternalLink(link, `primaryNavigation.links.${index}`),
    })),
    signInLabel: string(
      navigation.signInLabel,
      'primaryNavigation.signInLabel',
    ),
    primaryCtaLabel: string(
      navigation.primaryCtaLabel,
      'primaryNavigation.primaryCtaLabel',
    ),
  };
}

export interface RawLandingSnapshot {
  readonly articles: readonly unknown[];
  readonly campaigns: readonly unknown[];
  readonly categories: readonly unknown[];
  readonly pricing: unknown;
  readonly marketingPages: readonly unknown[];
  readonly siteSettings: unknown;
  readonly primaryNavigation: unknown;
}

export function normalizeLandingSnapshot(
  input: RawLandingSnapshot,
): UnknownRecord {
  return {
    schemaVersion: 1,
    articles: input.articles.map(normalizeArticleDocument),
    campaigns: input.campaigns.map(normalizeCampaignDocument),
    categories: input.categories.map(normalizeCategoryDocument),
    pricing: normalizePricingDocument(input.pricing),
    marketingPages: input.marketingPages.map(normalizeMarketingPageDocument),
    siteSettings: normalizeSiteSettingsDocument(input.siteSettings),
    primaryNavigation: normalizeNavigationDocument(input.primaryNavigation),
  };
}
