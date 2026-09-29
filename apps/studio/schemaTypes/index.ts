import { prepareCampaignPreview, preparePricingPreview } from './previews.js';
import {
  validateCampaignExpiryPolicy,
  validateCampaignSchedule,
  validateCampaignSections,
  validateInternalHref,
  validateIsoDate,
  validateLegalPageSections,
  validateMarketingPageSlug,
  validatePricingBilling,
  validatePricingCurrencyCode,
  validatePricingDocument,
  validatePricingLocale,
  validateSlug,
} from './validation.js';
import { defineArrayMember, defineField, defineType } from 'sanity';

const requiredText = <RuleType extends { required: () => RuleType }>(
  rule: RuleType,
): RuleType => rule.required();

export const seoFields = defineType({
  name: 'seoFields',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({ name: 'title', type: 'string', validation: requiredText }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      validation: requiredText,
    }),
  ],
});

export const localMedia = defineType({
  name: 'localMedia',
  title: 'Editorial image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      validation: requiredText,
    }),
    defineField({ name: 'alt', type: 'string', validation: requiredText }),
    defineField({ name: 'caption', type: 'string', validation: requiredText }),
  ],
});

export const internalLink = defineType({
  name: 'internalLink',
  title: 'Internal link',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: requiredText }),
    defineField({
      name: 'href',
      type: 'string',
      validation: (rule) =>
        rule
          .required()
          .custom((href) =>
            validateInternalHref(href)
              ? true
              : 'Use a safe root-relative path without queries or traversal.',
          ),
    }),
  ],
});

export const articleProseV1 = defineType({
  name: 'articleProseV1',
  title: 'Article prose v1',
  type: 'object',
  fields: [
    defineField({ name: 'heading', type: 'string', validation: requiredText }),
    defineField({
      name: 'paragraphs',
      type: 'array',
      of: [defineArrayMember({ type: 'text', rows: 4 })],
      validation: (rule) => rule.required().min(1),
    }),
  ],
});

export const articlePullQuoteV1 = defineType({
  name: 'articlePullQuoteV1',
  title: 'Article pull quote v1',
  type: 'object',
  fields: [
    defineField({ name: 'quote', type: 'text', validation: requiredText }),
  ],
});

export const legalSectionV1 = defineType({
  name: 'legalSectionV1',
  title: 'Legal section v1',
  type: 'object',
  fields: [
    defineField({ name: 'heading', type: 'string', validation: requiredText }),
    defineField({
      name: 'paragraphs',
      type: 'array',
      of: [defineArrayMember({ type: 'text', rows: 4 })],
      validation: (rule) => rule.required().min(1),
    }),
  ],
});

export const campaignHeroV1 = defineType({
  name: 'campaignHeroV1',
  title: 'Campaign hero v1',
  type: 'object',
  fields: [
    defineField({ name: 'eyebrow', type: 'string', validation: requiredText }),
    defineField({ name: 'headline', type: 'string', validation: requiredText }),
    defineField({
      name: 'introduction',
      type: 'text',
      validation: requiredText,
    }),
    defineField({
      name: 'image',
      type: 'localMedia',
      validation: requiredText,
    }),
    defineField({
      name: 'cta',
      type: 'campaignConversionCta',
      validation: requiredText,
    }),
  ],
});

export const campaignConversionCta = defineType({
  name: 'campaignConversionCta',
  title: 'Campaign conversion CTA',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: requiredText }),
    defineField({
      name: 'action',
      type: 'string',
      options: {
        list: [
          { title: 'Register', value: 'register' },
          { title: 'Sign in', value: 'login' },
        ],
        layout: 'radio',
      },
      validation: requiredText,
    }),
  ],
});

export const campaignBenefitsV1 = defineType({
  name: 'campaignBenefitsV1',
  title: 'Campaign benefits v1',
  type: 'object',
  fields: [
    defineField({ name: 'heading', type: 'string', validation: requiredText }),
    defineField({
      name: 'items',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              type: 'string',
              validation: requiredText,
            }),
            defineField({
              name: 'description',
              type: 'text',
              validation: requiredText,
            }),
          ],
        }),
      ],
    }),
  ],
});

export const campaignFaqV1 = defineType({
  name: 'campaignFaqV1',
  title: 'Campaign FAQ v1',
  type: 'object',
  fields: [
    defineField({ name: 'heading', type: 'string', validation: requiredText }),
    defineField({
      name: 'items',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'question',
              type: 'string',
              validation: requiredText,
            }),
            defineField({
              name: 'answer',
              type: 'text',
              validation: requiredText,
            }),
          ],
        }),
      ],
    }),
  ],
});

export const campaignCtaV1 = defineType({
  name: 'campaignCtaV1',
  title: 'Campaign CTA v1',
  type: 'object',
  fields: [
    defineField({ name: 'heading', type: 'string', validation: requiredText }),
    defineField({ name: 'copy', type: 'text', validation: requiredText }),
    defineField({
      name: 'cta',
      type: 'campaignConversionCta',
      validation: requiredText,
    }),
  ],
});

export const pricingConversionCta = defineType({
  name: 'pricingConversionCta',
  title: 'Pricing conversion CTA',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: requiredText }),
    defineField({
      name: 'action',
      type: 'string',
      options: {
        list: [
          { title: 'Register', value: 'register' },
          { title: 'Sign in', value: 'login' },
        ],
        layout: 'radio',
      },
      validation: requiredText,
    }),
  ],
});

export const pricingBilling = defineType({
  name: 'pricingBilling',
  title: 'Billing cadence',
  type: 'object',
  fields: [
    defineField({
      name: 'cadence',
      type: 'string',
      options: {
        list: [
          { title: 'Monthly', value: 'month' },
          { title: 'Annual', value: 'year' },
          { title: 'One time', value: 'one_time' },
        ],
        layout: 'radio',
      },
      validation: requiredText,
    }),
    defineField({
      name: 'interval',
      type: 'number',
      description: 'Required for recurring billing; omit for one-time access.',
      validation: (rule) => rule.integer().positive(),
    }),
  ],
});

export const pricingPlan = defineType({
  name: 'pricingPlan',
  title: 'Pricing plan',
  type: 'object',
  fields: [
    defineField({
      name: 'planId',
      type: 'string',
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validateSlug(value)
              ? true
              : 'Use a stable lowercase ID with single hyphens.',
          ),
    }),
    defineField({ name: 'name', type: 'string', validation: requiredText }),
    defineField({ name: 'summary', type: 'text', validation: requiredText }),
    defineField({
      name: 'amountMinor',
      title: 'Amount in minor currency units',
      type: 'number',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'billing',
      type: 'pricingBilling',
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validatePricingBilling(value)
              ? true
              : 'Recurring billing requires a positive interval; one-time billing must omit it.',
          ),
    }),
    defineField({
      name: 'entitlements',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              validation: requiredText,
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'cta',
      type: 'pricingConversionCta',
      validation: requiredText,
    }),
    defineField({
      name: 'recommended',
      type: 'boolean',
      initialValue: false,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'planId' } },
});

export const pricingFaqItem = defineType({
  name: 'pricingFaqItem',
  title: 'Pricing FAQ item',
  type: 'object',
  fields: [
    defineField({ name: 'question', type: 'string', validation: requiredText }),
    defineField({ name: 'answer', type: 'text', validation: requiredText }),
  ],
});

const lifecycleFields = [
  defineField({
    name: 'schemaVersion',
    type: 'number',
    initialValue: 1,
    readOnly: true,
    validation: (rule) =>
      rule
        .required()
        .custom((value) =>
          value === 1 ? true : 'Only schema version 1 is supported.',
        ),
  }),
  defineField({
    name: 'status',
    type: 'string',
    initialValue: 'draft',
    options: {
      list: [
        { title: 'Draft', value: 'draft' },
        { title: 'Published', value: 'published' },
      ],
      layout: 'radio',
    },
    validation: (rule) => rule.required(),
  }),
] as const;

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({ name: 'name', type: 'string', validation: requiredText }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name' },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validateSlug(value)
              ? true
              : 'Use lowercase words separated by single hyphens.',
          ),
    }),
    defineField({ name: 'eyebrow', type: 'string', validation: requiredText }),
    defineField({ name: 'headline', type: 'string', validation: requiredText }),
    defineField({
      name: 'introduction',
      type: 'text',
      validation: requiredText,
    }),
    defineField({
      name: 'backlink',
      type: 'internalLink',
      validation: requiredText,
    }),
    defineField({
      name: 'image',
      type: 'localMedia',
      validation: requiredText,
    }),
    defineField({
      name: 'focusHeading',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'focusIntroduction',
      type: 'text',
      validation: requiredText,
    }),
    defineField({
      name: 'focuses',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              type: 'string',
              validation: requiredText,
            }),
            defineField({
              name: 'description',
              type: 'text',
              validation: requiredText,
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'closingHeading',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'closingCopy',
      type: 'text',
      validation: requiredText,
    }),
    defineField({ name: 'seo', type: 'seoFields', validation: requiredText }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'status', media: 'image.image' },
  },
});

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: requiredText }),
    defineField({
      name: 'entityType',
      type: 'string',
      initialValue: 'Organization',
      readOnly: true,
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value === 'Organization'
              ? true
              : 'Only Organization authors are supported in v1.',
          ),
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'entityType' },
  },
});

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({ name: 'title', type: 'string', validation: requiredText }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validateSlug(value)
              ? true
              : 'Use lowercase words separated by single hyphens.',
          ),
    }),
    defineField({ name: 'dek', type: 'text', validation: requiredText }),
    defineField({
      name: 'category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: requiredText,
    }),
    defineField({
      name: 'author',
      type: 'reference',
      to: [{ type: 'author' }],
      validation: requiredText,
    }),
    defineField({
      name: 'image',
      type: 'localMedia',
      validation: requiredText,
    }),
    defineField({
      name: 'sections',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({ type: 'articleProseV1' }),
        defineArrayMember({ type: 'articlePullQuoteV1' }),
      ],
    }),
    defineField({ name: 'seo', type: 'seoFields', validation: requiredText }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'category.name',
      media: 'image.image',
    },
  },
});

export const campaignPage = defineType({
  name: 'campaignPage',
  title: 'Campaign',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({
      name: 'campaignId',
      type: 'string',
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validateSlug(value)
              ? true
              : 'Use a stable lowercase ID with single hyphens.',
          ),
    }),
    defineField({ name: 'title', type: 'string', validation: requiredText }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validateSlug(value)
              ? true
              : 'Use lowercase words separated by single hyphens.',
          ),
    }),
    defineField({
      name: 'audienceDescription',
      type: 'text',
      validation: requiredText,
    }),
    defineField({
      name: 'startsAt',
      type: 'datetime',
      validation: requiredText,
    }),
    defineField({ name: 'endsAt', type: 'datetime', validation: requiredText }),
    defineField({
      name: 'expiryPolicy',
      type: 'object',
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validateCampaignExpiryPolicy(value)
              ? true
              : 'Choose gone/archive without a successor, or redirect with a safe successor.',
          ),
      fields: [
        defineField({
          name: 'mode',
          type: 'string',
          options: {
            list: [
              { title: 'Return gone', value: 'gone' },
              { title: 'Redirect', value: 'redirect' },
              { title: 'Keep archived', value: 'archive' },
            ],
            layout: 'radio',
          },
          validation: requiredText,
        }),
        defineField({ name: 'successor', type: 'internalLink' }),
      ],
    }),
    defineField({
      name: 'sections',
      type: 'array',
      description:
        'Start with exactly one hero. Add at most one final conversion CTA.',
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .custom((value) =>
            validateCampaignSections(value)
              ? true
              : 'Start with one hero, use unique items and include at most one final CTA.',
          ),
      of: [
        defineArrayMember({ type: 'campaignHeroV1' }),
        defineArrayMember({ type: 'campaignBenefitsV1' }),
        defineArrayMember({ type: 'campaignFaqV1' }),
        defineArrayMember({ type: 'campaignCtaV1' }),
      ],
    }),
    defineField({ name: 'seo', type: 'seoFields', validation: requiredText }),
  ],
  validation: (rule) =>
    rule.custom((document) =>
      validateCampaignSchedule(document)
        ? true
        : 'Campaign start must be before end and both dates must be UTC ISO values.',
    ),
  preview: {
    select: {
      title: 'title',
      status: 'status',
      startsAt: 'startsAt',
      endsAt: 'endsAt',
      media: 'sections.0.image.image',
    },
    prepare: prepareCampaignPreview,
  },
});

export const pricingPage = defineType({
  name: 'pricingPage',
  title: 'Pricing',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({ name: 'title', type: 'string', validation: requiredText }),
    defineField({
      name: 'introduction',
      type: 'text',
      validation: requiredText,
    }),
    defineField({
      name: 'currencyCode',
      description: 'Three-letter uppercase currency code, for example USD.',
      type: 'string',
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validatePricingCurrencyCode(value)
              ? true
              : 'Use a three-letter uppercase ISO currency code, for example USD.',
          ),
    }),
    defineField({
      name: 'currencyMinorUnit',
      description: 'Number of decimal places used by the selected currency.',
      type: 'number',
      validation: (rule) => rule.required().integer().min(0).max(3),
    }),
    defineField({
      name: 'locale',
      description: 'Formatting locale, for example en-US.',
      type: 'string',
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validatePricingLocale(value)
              ? true
              : 'Use a locale such as en-US or vi-VN.',
          ),
    }),
    defineField({
      name: 'plans',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [defineArrayMember({ type: 'pricingPlan' })],
    }),
    defineField({
      name: 'faq',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [defineArrayMember({ type: 'pricingFaqItem' })],
    }),
    defineField({
      name: 'cancellationTerms',
      type: 'text',
      validation: requiredText,
    }),
    defineField({
      name: 'refundTerms',
      type: 'text',
      validation: requiredText,
    }),
    defineField({ name: 'seo', type: 'seoFields', validation: requiredText }),
  ],
  validation: (rule) =>
    rule.custom((document) =>
      validatePricingDocument(document)
        ? true
        : 'Check currency, minor units, plan IDs, amounts, cadence and recommendation.',
    ),
  preview: {
    select: {
      title: 'title',
      status: 'status',
      currencyCode: 'currencyCode',
      plans: 'plans',
    },
    prepare: preparePricingPreview,
  },
});

export const marketingPage = defineType({
  name: 'marketingPage',
  title: 'Page',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({
      name: 'template',
      type: 'string',
      initialValue: 'legal.v1',
      readOnly: true,
      options: { list: [{ title: 'Legal v1', value: 'legal.v1' }] },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value === 'legal.v1' ? true : 'Only legal.v1 is supported.',
          ),
    }),
    defineField({ name: 'title', type: 'string', validation: requiredText }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validateMarketingPageSlug(value)
              ? true
              : 'Use a normalized slug outside reserved application routes.',
          ),
    }),
    defineField({
      name: 'introduction',
      type: 'text',
      rows: 3,
      validation: requiredText,
    }),
    defineField({
      name: 'effectiveDate',
      title: 'Effective date',
      type: 'date',
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validateIsoDate(value) ? true : 'Use a valid ISO calendar date.',
          ),
    }),
    defineField({
      name: 'sections',
      type: 'array',
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .custom((value) =>
            validateLegalPageSections(value)
              ? true
              : 'Use unique legal section keys and supported section versions.',
          ),
      of: [defineArrayMember({ type: 'legalSectionV1' })],
    }),
    defineField({ name: 'seo', type: 'seoFields', validation: requiredText }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'effectiveDate' },
  },
});

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({
      name: 'brandName',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'footerTagline',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'analyticsConsent',
      title: 'Analytics consent copy',
      description:
        'Optional. Add only after Legal approves every field. Removing it disables the consent surface.',
      type: 'analyticsConsent',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Site settings' }),
  },
});

export const analyticsConsent = defineType({
  name: 'analyticsConsent',
  title: 'Analytics consent copy',
  type: 'object',
  fields: [
    defineField({ name: 'heading', type: 'string', validation: requiredText }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      validation: requiredText,
    }),
    defineField({
      name: 'allowLabel',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'declineLabel',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'manageLabel',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'privacyLink',
      type: 'internalLink',
      validation: requiredText,
    }),
  ],
});

export const primaryNavigation = defineType({
  name: 'primaryNavigation',
  title: 'Primary navigation',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({
      name: 'links',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [defineArrayMember({ type: 'internalLink' })],
    }),
    defineField({
      name: 'signInLabel',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'primaryCtaLabel',
      type: 'string',
      validation: requiredText,
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Primary navigation' }),
  },
});

export const schemaTypes = [
  seoFields,
  localMedia,
  internalLink,
  articleProseV1,
  articlePullQuoteV1,
  legalSectionV1,
  campaignConversionCta,
  campaignHeroV1,
  campaignBenefitsV1,
  campaignFaqV1,
  campaignCtaV1,
  pricingConversionCta,
  pricingBilling,
  pricingPlan,
  pricingFaqItem,
  analyticsConsent,
  category,
  author,
  article,
  campaignPage,
  pricingPage,
  marketingPage,
  siteSettings,
  primaryNavigation,
];
