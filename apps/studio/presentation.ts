import { defineLocations } from 'sanity/presentation';

type LocationState =
  | { locations: Array<{ title: string; href: string }> }
  | { message: string; tone?: 'caution' };

export function resolveDocumentLocations(
  type: string,
  slug: unknown,
): LocationState {
  if (type === 'siteSettings' || type === 'primaryNavigation') {
    return { locations: [{ title: 'Landing preview', href: '/' }] };
  }
  if (
    type !== 'article' &&
    type !== 'category' &&
    type !== 'campaignPage' &&
    type !== 'marketingPage'
  ) {
    return { message: 'This document has no landing preview route.' };
  }
  if (typeof slug !== 'string' || slug.length === 0) {
    return {
      message: 'Publish a valid slug before opening the preview.',
      tone: 'caution',
    };
  }
  const prefix =
    type === 'article'
      ? '/articles'
      : type === 'campaignPage'
        ? '/campaigns'
        : type === 'category'
          ? '/movement'
          : '';
  return {
    locations: [{ title: 'Landing preview', href: `${prefix}/${slug}/` }],
  };
}

const slugLocation = (
  type: 'article' | 'campaignPage' | 'category' | 'marketingPage',
) =>
  defineLocations({
    select: { slug: 'slug.current' },
    resolve: (value) => resolveDocumentLocations(type, value?.slug),
  });

export const presentationLocations = {
  article: slugLocation('article'),
  campaignPage: slugLocation('campaignPage'),
  marketingPage: slugLocation('marketingPage'),
  category: slugLocation('category'),
  siteSettings: defineLocations(
    resolveDocumentLocations('siteSettings', undefined),
  ),
  primaryNavigation: defineLocations(
    resolveDocumentLocations('primaryNavigation', undefined),
  ),
};
