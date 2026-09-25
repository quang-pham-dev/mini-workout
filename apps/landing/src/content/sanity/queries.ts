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

export const publishedSiteSettingsQuery = `
  *[_type == "siteSettings" && status == "published"] {
    _type,
    schemaVersion,
    status,
    brandName,
    footerTagline
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
export const previewSiteSettingsQuery = asPreviewQuery(
  publishedSiteSettingsQuery,
);
export const previewPrimaryNavigationQuery = asPreviewQuery(
  publishedPrimaryNavigationQuery,
);
