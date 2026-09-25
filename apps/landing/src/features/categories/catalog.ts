import { mapPublishedCategoryDocuments } from '../../content/published-category.js';
import type {
  InternalLink,
  LocalMedia,
} from '../../content/validation-primitives.js';

export interface CategorySeo {
  title: string;
  description: string;
  canonicalPath: `/movement/${string}/`;
}

export interface CategoryFocus {
  key: string;
  title: string;
  description: string;
}

export interface CategoryViewModel {
  slug: string;
  name: string;
  status: 'published';
  eyebrow: string;
  headline: string;
  introduction: string;
  backlink: InternalLink;
  image: LocalMedia;
  focusHeading: string;
  focusIntroduction: string;
  focuses: readonly CategoryFocus[];
  closingHeading: string;
  closingCopy: string;
  seo: CategorySeo;
}

const categoryDocuments: readonly unknown[] = [
  {
    _type: 'category',
    schemaVersion: 1,
    slug: 'mobility',
    name: 'Mobility',
    status: 'published',
    eyebrow: 'Everyday mobility',
    headline: 'Move with more room.',
    introduction:
      'Explore gentle, intentional movement for the places that feel ready for attention.',
    backlink: {
      label: 'Ways to move',
      href: '/#ways-to-move',
    },
    image: {
      src: '/images/home/mobility-stretch.webp',
      alt: 'Man stretching his side on a mat at home.',
      width: 1122,
      height: 1402,
      caption: 'Make space to notice how your body wants to move today.',
    },
    focusHeading: 'Start where you feel it',
    focusIntroduction:
      'Choose an area to explore, then move with a range that feels comfortable for you.',
    focuses: [
      {
        _key: 'upper-body',
        title: 'Shoulders & upper body',
        description:
          'Explore reaching, circling and opening movements at your own pace.',
      },
      {
        _key: 'lower-body',
        title: 'Hips & lower body',
        description:
          'Try grounded movements that invite the hips and legs to move in different directions.',
      },
      {
        _key: 'whole-body',
        title: 'Whole-body flow',
        description:
          'Connect a few simple shapes and notice how one movement leads into the next.',
      },
    ],
    closingHeading: 'Find a rhythm you can return to.',
    closingCopy:
      'Choose mobility in your interests and shape a weekly routine around your starting point.',
    seo: {
      title: 'Mobility exercises for everyday movement | Mini Workout',
      description:
        'Explore approachable mobility exercises for your shoulders, hips and whole body, then build a weekly movement routine that fits real life.',
    },
  },
] as const;

const categories = mapPublishedCategoryDocuments(categoryDocuments);

export function getCategoryBySlug(slug: string): CategoryViewModel | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getPublishedCategories(): readonly CategoryViewModel[] {
  return categories;
}

export function getPublishedCategoryPaths(): CategorySeo['canonicalPath'][] {
  return categories.map((category) => category.seo.canonicalPath);
}
