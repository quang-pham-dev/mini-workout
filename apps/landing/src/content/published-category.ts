import type {
  CategoryFocus,
  CategoryViewModel,
} from '../features/categories/catalog.js';
import {
  ContentContractError,
  type ContentContractIssue,
  type ContentMappingResult,
  isRecord,
  mapInternalLink,
  mapLocalMedia,
  mapSeo,
  mapSlug,
  requiredString,
} from './validation-primitives.js';

export { ContentContractError } from './validation-primitives.js';

const reservedCategorySlugs = ['admin', 'api', 'app', 'articles', 'studio'];

function mapFocus(
  input: unknown,
  index: number,
  issues: ContentContractIssue[],
): CategoryFocus | undefined {
  const path = `focuses.${index}`;
  if (!isRecord(input)) {
    issues.push({ code: 'focus', path });
    return undefined;
  }
  return {
    key: requiredString(input, '_key', `${path}._key`, issues),
    title: requiredString(input, 'title', `${path}.title`, issues),
    description: requiredString(
      input,
      'description',
      `${path}.description`,
      issues,
    ),
  };
}

export function mapCategoryDocument(
  input: unknown,
): ContentMappingResult<CategoryViewModel> {
  const issues: ContentContractIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ code: 'document', path: '' }] };
  }
  if (input._type !== 'category') {
    issues.push({ code: 'document_type', path: '_type' });
  }
  if (input.schemaVersion !== 1) {
    issues.push({ code: 'schema_version', path: 'schemaVersion' });
  }
  if (input.status !== 'published') {
    issues.push({ code: 'status', path: 'status' });
  }

  const slug = mapSlug(input, 'slug', 'slug', issues, {
    reserved: reservedCategorySlugs,
  });
  const focusValues = input.focuses;
  const focuses = Array.isArray(focusValues)
    ? focusValues.flatMap((focus, index) => {
        const mapped = mapFocus(focus, index, issues);
        return mapped ? [mapped] : [];
      })
    : [];
  if (!Array.isArray(focusValues) || focusValues.length === 0) {
    issues.push({ code: 'focuses', path: 'focuses' });
  }
  const focusKeys = focuses.map((focus) => focus.key);
  if (new Set(focusKeys).size !== focusKeys.length) {
    issues.push({ code: 'focus_key', path: 'focuses' });
  }

  const canonicalPath = `/movement/${slug}/` as const;
  const value: CategoryViewModel = {
    slug,
    name: requiredString(input, 'name', 'name', issues),
    status: 'published',
    eyebrow: requiredString(input, 'eyebrow', 'eyebrow', issues),
    headline: requiredString(input, 'headline', 'headline', issues),
    introduction: requiredString(input, 'introduction', 'introduction', issues),
    backlink: mapInternalLink(input.backlink, 'backlink', issues),
    image: mapLocalMedia(input.image, 'image', issues),
    focusHeading: requiredString(input, 'focusHeading', 'focusHeading', issues),
    focusIntroduction: requiredString(
      input,
      'focusIntroduction',
      'focusIntroduction',
      issues,
    ),
    focuses,
    closingHeading: requiredString(
      input,
      'closingHeading',
      'closingHeading',
      issues,
    ),
    closingCopy: requiredString(input, 'closingCopy', 'closingCopy', issues),
    seo: mapSeo(input.seo, 'seo', canonicalPath, issues),
  };
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value };
}

export function mapPublishedCategoryDocuments(
  inputs: readonly unknown[],
): CategoryViewModel[] {
  const publishedSlugs = new Set<string>();
  return inputs.flatMap((input, documentIndex) => {
    if (isRecord(input) && input.status === 'draft') return [];
    const result = mapCategoryDocument(input);
    if (!result.ok) {
      throw new ContentContractError('Category', result.issues, documentIndex);
    }
    if (publishedSlugs.has(result.value.slug)) {
      throw new ContentContractError(
        'Category',
        [{ code: 'duplicate_slug', path: 'slug' }],
        documentIndex,
      );
    }
    publishedSlugs.add(result.value.slug);
    return [result.value];
  });
}
