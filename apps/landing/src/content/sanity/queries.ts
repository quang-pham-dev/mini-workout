export const publishedArticlesQuery = `
  *[_type == "article" && status == "published"] | order(slug.current asc) {
    _type,
    schemaVersion,
    status,
    "slug": slug.current,
    "category": {"slug": category->slug.current, "name": category->name},
    title,
    dek,
    "author": {"name": author->name, "type": author->entityType},
    "image": {
      "src": image.image.asset->url,
      "alt": image.alt,
      "width": image.image.asset->metadata.dimensions.width,
      "height": image.image.asset->metadata.dimensions.height,
      "caption": image.caption
    },
    "sections": sections[]{"_key": _key, "_type": select(_type == "articleProseV1" => "prose.v1", _type == "articlePullQuoteV1" => "pullQuote.v1"), heading, paragraphs, quote},
    seo
  }
`;

export const publishedCategoriesQuery = `
  *[_type == "category" && status == "published"] | order(slug.current asc) {
    _type,
    schemaVersion,
    status,
    "slug": slug.current,
    name,
    eyebrow,
    headline,
    introduction,
    backlink,
    "image": {
      "src": image.image.asset->url,
      "alt": image.alt,
      "width": image.image.asset->metadata.dimensions.width,
      "height": image.image.asset->metadata.dimensions.height,
      "caption": image.caption
    },
    focusHeading,
    focusIntroduction,
    "focuses": focuses[]{"_key": _key, title, description},
    closingHeading,
    closingCopy,
    seo
  }
`;

export const publishedCampaignsQuery = `
  *[_type == "campaignPage" && status == "published"] | order(slug.current asc) {
    _type,
    schemaVersion,
    status,
    campaignId,
    "slug": slug.current,
    title,
    audienceDescription,
    startsAt,
    endsAt,
    expiryPolicy,
    "sections": sections[]{
      "_key": _key,
      "_type": select(
        _type == "campaignHeroV1" => "campaignHero.v1",
        _type == "campaignBenefitsV1" => "campaignBenefits.v1",
        _type == "campaignFaqV1" => "campaignFaq.v1",
        _type == "campaignCtaV1" => "campaignCta.v1"
      ),
      eyebrow,
      headline,
      introduction,
      "image": {
        "src": image.image.asset->url,
        "alt": image.alt,
        "width": image.image.asset->metadata.dimensions.width,
        "height": image.image.asset->metadata.dimensions.height,
        "caption": image.caption
      },
      cta,
      heading,
      "items": items[]{"_key": _key, title, description, question, answer},
      copy
    },
    seo
  }
`;

export const publishedPricingQuery = `
  *[_type == "pricingPage" && status == "published"] {
    _type,
    schemaVersion,
    status,
    title,
    introduction,
    currencyCode,
    currencyMinorUnit,
    locale,
    "plans": plans[]{
      "_key": _key,
      planId,
      name,
      summary,
      amountMinor,
      billing,
      "entitlements": entitlements[]{"_key": _key, label},
      cta,
      recommended
    },
    "faq": faq[]{"_key": _key, question, answer},
    cancellationTerms,
    refundTerms,
    seo
  }
`;

export const publishedSiteSettingsQuery = `
  *[_type == "siteSettings" && status == "published"] {
    _type,
    schemaVersion,
    status,
    brandName,
    footerTagline,
    analyticsConsent {
      heading,
      description,
      allowLabel,
      declineLabel,
      manageLabel,
      privacyLink {label, href}
    }
  }
`;

export const publishedPrimaryNavigationQuery = `
  *[_type == "primaryNavigation" && status == "published"] {
    _type,
    schemaVersion,
    status,
    "links": links[]{"_key": _key, label, href},
    signInLabel,
    primaryCtaLabel
  }
`;

function asPreviewQuery(query: string): string {
  return query
    .replace(' && status == "published"', '')
    .replace('\n    status,', '\n    "status": "published",');
}

export const previewArticlesQuery = asPreviewQuery(publishedArticlesQuery);
export const previewCategoriesQuery = asPreviewQuery(publishedCategoriesQuery);
export const previewCampaignsQuery = asPreviewQuery(publishedCampaignsQuery);
export const previewPricingQuery = asPreviewQuery(publishedPricingQuery);
export const previewSiteSettingsQuery = asPreviewQuery(
  publishedSiteSettingsQuery,
);
export const previewPrimaryNavigationQuery = asPreviewQuery(
  publishedPrimaryNavigationQuery,
);
