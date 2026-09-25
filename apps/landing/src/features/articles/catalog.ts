import { mapPublishedArticleDocuments } from '../../content/published-article.js';
import type { ArticleSection } from '../../content/section-registry.js';

export interface ArticleSummary {
  slug: string;
  title: string;
  excerpt: string;
  canonicalPath: `/articles/${string}/`;
  image: ArticleViewModel['image'];
}

export interface ArticleViewModel {
  slug: string;
  status: 'published';
  categorySlug: string;
  categoryName: string;
  title: string;
  dek: string;
  author: {
    name: string;
    type: 'Organization';
  };
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
    caption: string;
  };
  sections: readonly ArticleSection[];
  seo: {
    title: string;
    description: string;
    canonicalPath: `/articles/${string}/`;
  };
}

const articleDocuments: readonly unknown[] = [
  {
    _type: 'article',
    schemaVersion: 1,
    slug: 'a-gentler-way-to-explore-mobility',
    status: 'published',
    category: {
      slug: 'mobility',
      name: 'Mobility',
    },
    title: 'A gentler way to explore your range',
    dek: 'Mobility can be a practice of paying attention, not a test of how far you can reach.',
    author: {
      name: 'Mini Workout editorial',
      type: 'Organization',
    },
    image: {
      src: '/images/articles/mobility-range.webp',
      alt: 'Woman exploring a seated side bend on a mat at home.',
      width: 1536,
      height: 1024,
      caption: 'Let the shape meet you where you are today.',
    },
    sections: [
      {
        _key: 'range-is-not-a-score',
        _type: 'prose.v1',
        heading: 'Range is not a score',
        paragraphs: [
          'It is easy to treat mobility like a destination: a deeper fold, a wider stance, a shape that looks a certain way. But range changes from day to day, and more is not always the point.',
          'A useful practice begins with the range you have now. Move slowly enough to notice where the motion feels clear, where it feels less familiar, and where you would rather stop.',
        ],
      },
      {
        _key: 'meet-the-movement',
        _type: 'pullQuote.v1',
        quote: 'Meet the movement you have today, not the shape you expected.',
      },
      {
        _key: 'start-with-attention',
        _type: 'prose.v1',
        heading: 'Start with attention',
        paragraphs: [
          'Choose one simple direction, such as reaching overhead, turning gently or shifting your weight. Give the movement your attention before adding more range.',
          'Your breath, balance and sense of effort can all offer information. None of them need to be forced into a particular result.',
        ],
      },
      {
        _key: 'let-the-movement-change',
        _type: 'prose.v1',
        heading: 'Let the movement change',
        paragraphs: [
          'You can make a shape smaller, change your position or pause between repetitions. Those choices are part of the practice, not a step away from it.',
          'Over time, returning with curiosity can help you understand which kinds of movement fit naturally into your week.',
        ],
      },
    ],
    seo: {
      title: 'A gentler way to explore mobility | Mini Workout',
      description:
        'Explore mobility as an attentive movement practice, with approachable ways to notice range, effort and the choices available to you.',
    },
  },
] as const;

const articles = mapPublishedArticleDocuments(articleDocuments);

export function getArticleBySlug(slug: string): ArticleViewModel | undefined {
  return articles.find((article) => article.slug === slug);
}

export function getPublishedArticles(): readonly ArticleViewModel[] {
  return articles;
}

export function getPublishedArticlePaths(): ArticleViewModel['seo']['canonicalPath'][] {
  return articles.map((article) => article.seo.canonicalPath);
}

export function getPublishedArticlesForCategory(
  categorySlug: string,
): ArticleSummary[] {
  return summarizeArticlesForCategory(articles, categorySlug);
}

export function summarizeArticlesForCategory(
  sourceArticles: readonly ArticleViewModel[],
  categorySlug: string,
): ArticleSummary[] {
  return sourceArticles
    .filter((article) => article.categorySlug === categorySlug)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.dek,
      canonicalPath: article.seo.canonicalPath,
      image: article.image,
    }));
}
