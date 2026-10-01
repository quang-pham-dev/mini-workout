import type { Schema, Struct } from '@strapi/strapi';

export interface ArticleProseV1 extends Struct.ComponentSchema {
  collectionName: 'components_article_prose_v1';
  info: {
    displayName: 'Prose v1';
  };
  attributes: {
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    paragraphs: Schema.Attribute.JSON & Schema.Attribute.Required;
  };
}

export interface ArticlePullQuoteV1 extends Struct.ComponentSchema {
  collectionName: 'components_article_pull_quote_v1';
  info: {
    displayName: 'Pull quote v1';
  };
  attributes: {
    quote: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface CampaignBenefitItemV1 extends Struct.ComponentSchema {
  collectionName: 'components_campaign_benefit_items_v1';
  info: {
    displayName: 'Benefit item v1';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CampaignBenefitsV1 extends Struct.ComponentSchema {
  collectionName: 'components_campaign_benefits_v1';
  info: {
    displayName: 'Benefits v1';
  };
  attributes: {
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    items: Schema.Attribute.Component<'campaign.benefit-item-v1', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
  };
}

export interface CampaignCtaV1 extends Struct.ComponentSchema {
  collectionName: 'components_campaign_ctas_v1';
  info: {
    displayName: 'Final CTA v1';
  };
  attributes: {
    copy: Schema.Attribute.Text & Schema.Attribute.Required;
    cta: Schema.Attribute.Component<'shared.conversion-cta', false> &
      Schema.Attribute.Required;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CampaignExpiryPolicy extends Struct.ComponentSchema {
  collectionName: 'components_campaign_expiry_policies';
  info: {
    displayName: 'Expiry policy';
  };
  attributes: {
    mode: Schema.Attribute.Enumeration<['gone', 'redirect', 'archive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'gone'>;
    successor: Schema.Attribute.Component<'shared.internal-link', false>;
  };
}

export interface CampaignFaqItemV1 extends Struct.ComponentSchema {
  collectionName: 'components_campaign_faq_items_v1';
  info: {
    displayName: 'FAQ item v1';
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CampaignFaqV1 extends Struct.ComponentSchema {
  collectionName: 'components_campaign_faqs_v1';
  info: {
    displayName: 'FAQ v1';
  };
  attributes: {
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    items: Schema.Attribute.Component<'campaign.faq-item-v1', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
  };
}

export interface CampaignHeroV1 extends Struct.ComponentSchema {
  collectionName: 'components_campaign_heroes_v1';
  info: {
    displayName: 'Hero v1';
  };
  attributes: {
    cta: Schema.Attribute.Component<'shared.conversion-cta', false> &
      Schema.Attribute.Required;
    eyebrow: Schema.Attribute.String & Schema.Attribute.Required;
    headline: Schema.Attribute.String & Schema.Attribute.Required;
    image: Schema.Attribute.Component<'shared.editorial-media', false> &
      Schema.Attribute.Required;
    introduction: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface CategoryFocusV1 extends Struct.ComponentSchema {
  collectionName: 'components_category_focuses_v1';
  info: {
    displayName: 'Category focus v1';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LegalSectionV1 extends Struct.ComponentSchema {
  collectionName: 'components_legal_sections_v1';
  info: {
    displayName: 'Legal section v1';
  };
  attributes: {
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    paragraphs: Schema.Attribute.JSON & Schema.Attribute.Required;
  };
}

export interface PricingBilling extends Struct.ComponentSchema {
  collectionName: 'components_pricing_billings';
  info: {
    displayName: 'Billing';
  };
  attributes: {
    cadence: Schema.Attribute.Enumeration<['month', 'year', 'one_time']> &
      Schema.Attribute.Required;
    interval: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
  };
}

export interface PricingEntitlement extends Struct.ComponentSchema {
  collectionName: 'components_pricing_entitlements';
  info: {
    displayName: 'Entitlement';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PricingFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_pricing_faq_items';
  info: {
    displayName: 'Pricing FAQ item';
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PricingPlan extends Struct.ComponentSchema {
  collectionName: 'components_pricing_plans';
  info: {
    displayName: 'Pricing plan';
  };
  attributes: {
    amountMinor: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    billing: Schema.Attribute.Component<'pricing.billing', false> &
      Schema.Attribute.Required;
    cta: Schema.Attribute.Component<'shared.conversion-cta', false> &
      Schema.Attribute.Required;
    enabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    entitlements: Schema.Attribute.Component<'pricing.entitlement', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    planId: Schema.Attribute.UID & Schema.Attribute.Required;
    recommended: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    summary: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface SharedAnalyticsConsent extends Struct.ComponentSchema {
  collectionName: 'components_shared_analytics_consents';
  info: {
    displayName: 'Analytics consent';
  };
  attributes: {
    allowLabel: Schema.Attribute.String & Schema.Attribute.Required;
    declineLabel: Schema.Attribute.String & Schema.Attribute.Required;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    manageLabel: Schema.Attribute.String & Schema.Attribute.Required;
    privacyLink: Schema.Attribute.Component<'shared.internal-link', false> &
      Schema.Attribute.Required;
  };
}

export interface SharedConversionCta extends Struct.ComponentSchema {
  collectionName: 'components_shared_conversion_ctas';
  info: {
    displayName: 'Conversion CTA';
  };
  attributes: {
    action: Schema.Attribute.Enumeration<['register', 'login']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'register'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedEditorialMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_editorial_media';
  info: {
    displayName: 'Editorial media';
  };
  attributes: {
    alt: Schema.Attribute.String & Schema.Attribute.Required;
    caption: Schema.Attribute.String & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface SharedInternalLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_internal_links';
  info: {
    displayName: 'Internal link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'Search result title and description. Canonical paths are derived by Landing.';
    displayName: 'SEO';
  };
  attributes: {
    description: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'article.prose-v1': ArticleProseV1;
      'article.pull-quote-v1': ArticlePullQuoteV1;
      'campaign.benefit-item-v1': CampaignBenefitItemV1;
      'campaign.benefits-v1': CampaignBenefitsV1;
      'campaign.cta-v1': CampaignCtaV1;
      'campaign.expiry-policy': CampaignExpiryPolicy;
      'campaign.faq-item-v1': CampaignFaqItemV1;
      'campaign.faq-v1': CampaignFaqV1;
      'campaign.hero-v1': CampaignHeroV1;
      'category.focus-v1': CategoryFocusV1;
      'legal.section-v1': LegalSectionV1;
      'pricing.billing': PricingBilling;
      'pricing.entitlement': PricingEntitlement;
      'pricing.faq-item': PricingFaqItem;
      'pricing.plan': PricingPlan;
      'shared.analytics-consent': SharedAnalyticsConsent;
      'shared.conversion-cta': SharedConversionCta;
      'shared.editorial-media': SharedEditorialMedia;
      'shared.internal-link': SharedInternalLink;
      'shared.seo': SharedSeo;
    }
  }
}
