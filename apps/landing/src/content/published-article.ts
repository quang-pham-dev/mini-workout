import type { ArticleViewModel } from '../features/articles/catalog.js';
import type { ArticleSection } from './section-registry.js';
import { isArticleSectionKind } from './section-registry.js';
import {
  ContentContractError,
  type ContentContractIssue,
  type ContentMappingResult,
  isRecord,
  mapLocalMedia,
  mapSeo,
  mapSlug,
  requiredRecord,
  requiredString,
} from './validation-primitives.js';

export { ContentContractError } from './validation-primitives.js';

function mapSection(
  value: unknown,
  index: number,
  issues: ContentContractIssue[],
): ArticleSection | undefined {
  const path = `sections.${index}`;
  if (!isRecord(value)) {
    issues.push({ code: 'section', path });
    return undefined;
  }

  const kind = value._type;
  if (!isArticleSectionKind(kind)) {
    issues.push({ code: 'section_type', path: `${path}._type` });
    return undefined;
  }

  const key = requiredString(value, '_key', `${path}._key`, issues);
  if (kind === 'pullQuote.v1') {
    return {
      type: kind,
      key,
      quote: requiredString(value, 'quote', `${path}.quote`, issues),
    };
  }

  const heading = requiredString(value, 'heading', `${path}.heading`, issues);
  const paragraphValues = value.paragraphs;
  if (!Array.isArray(paragraphValues) || paragraphValues.length === 0) {
    issues.push({ code: 'paragraphs', path: `${path}.paragraphs` });
    return { type: kind, key, heading, paragraphs: [] };
  }

  const paragraphs = paragraphValues.flatMap((paragraph, paragraphIndex) => {
    if (typeof paragraph === 'string' && paragraph.trim().length > 0) {
      return [paragraph.trim()];
    }
    issues.push({
      code: 'paragraph',
      path: `${path}.paragraphs.${paragraphIndex}`,
    });
    return [];
  });

  return { type: kind, key, heading, paragraphs };
}

export function mapArticleDocument(
  input: unknown,
): ContentMappingResult<ArticleViewModel> {
  const issues: ContentContractIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ code: 'document', path: '' }] };
  }

  if (input._type !== 'article') {
    issues.push({ code: 'document_type', path: '_type' });
  }
  if (input.schemaVersion !== 1) {
    issues.push({ code: 'schema_version', path: 'schemaVersion' });
  }
  if (input.status !== 'published') {
    issues.push({ code: 'status', path: 'status' });
  }

  const slug = mapSlug(input, 'slug', 'slug', issues);

  const category = requiredRecord(input, 'category', 'category', issues);
  const categorySlug = mapSlug(category, 'slug', 'category.slug', issues);

  const author = requiredRecord(input, 'author', 'author', issues);
  const authorType = author.type;
  if (authorType !== 'Organization') {
    issues.push({ code: 'author_type', path: 'author.type' });
  }

  const sectionValues = input.sections;
  const sections = Array.isArray(sectionValues)
    ? sectionValues.flatMap((section, index) => {
        const mapped = mapSection(section, index, issues);
        return mapped ? [mapped] : [];
      })
    : [];
  if (!Array.isArray(sectionValues) || sectionValues.length === 0) {
    issues.push({ code: 'sections', path: 'sections' });
  }
  const sectionKeys = sections.map((section) => section.key);
  if (new Set(sectionKeys).size !== sectionKeys.length) {
    issues.push({ code: 'section_key', path: 'sections' });
  }

  const canonicalPath = `/articles/${slug}/` as const;
  const value: ArticleViewModel = {
    slug,
    status: 'published',
    categorySlug,
    categoryName: requiredString(category, 'name', 'category.name', issues),
    title: requiredString(input, 'title', 'title', issues),
    dek: requiredString(input, 'dek', 'dek', issues),
    author: {
      name: requiredString(author, 'name', 'author.name', issues),
      type: 'Organization',
    },
    image: mapLocalMedia(input.image, 'image', issues),
    sections,
    seo: mapSeo(input.seo, 'seo', canonicalPath, issues),
  };

  return issues.length > 0 ? { ok: false, issues } : { ok: true, value };
}

export function mapPublishedArticleDocuments(
  inputs: readonly unknown[],
): ArticleViewModel[] {
  const publishedSlugs = new Set<string>();
  return inputs.flatMap((input, documentIndex) => {
    if (isRecord(input) && input.status === 'draft') return [];

    const result = mapArticleDocument(input);
    if (!result.ok) {
      throw new ContentContractError('Article', result.issues, documentIndex);
    }
    if (publishedSlugs.has(result.value.slug)) {
      throw new ContentContractError(
        'Article',
        [{ code: 'duplicate_slug', path: 'slug' }],
        documentIndex,
      );
    }
    publishedSlugs.add(result.value.slug);
    return [result.value];
  });
}
