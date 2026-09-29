import type {
  LegalPageSection,
  MarketingPageViewModel,
} from '../features/pages/catalog.js';
import {
  ContentContractError,
  type ContentContractIssue,
  type ContentMappingResult,
  isRecord,
  mapSeo,
  mapSlug,
  requiredString,
} from './validation-primitives.js';

export { ContentContractError } from './validation-primitives.js';

export const marketingPageReservedSlugs = [
  '404',
  'api',
  'articles',
  'campaigns',
  'movement',
  'pricing',
  'robots',
  'sitemap',
] as const;

function mapEffectiveDate(
  value: unknown,
  issues: ContentContractIssue[],
): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    issues.push({ code: 'effective_date', path: 'effectiveDate' });
    return '';
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    issues.push({ code: 'effective_date', path: 'effectiveDate' });
  }
  return value;
}

function mapSection(
  input: unknown,
  index: number,
  issues: ContentContractIssue[],
): LegalPageSection | undefined {
  const path = `sections.${index}`;
  if (!isRecord(input)) {
    issues.push({ code: 'section', path });
    return undefined;
  }
  if (input._type !== 'legalSection.v1') {
    issues.push({ code: 'section_type', path: `${path}._type` });
    return undefined;
  }
  const values = input.paragraphs;
  const paragraphs = Array.isArray(values)
    ? values.flatMap((paragraph, paragraphIndex) => {
        if (typeof paragraph === 'string' && paragraph.trim().length > 0) {
          return [paragraph.trim()];
        }
        issues.push({
          code: 'paragraph',
          path: `${path}.paragraphs.${paragraphIndex}`,
        });
        return [];
      })
    : [];
  if (!Array.isArray(values) || values.length === 0) {
    issues.push({ code: 'paragraphs', path: `${path}.paragraphs` });
  }
  return {
    type: 'legalSection.v1',
    key: requiredString(input, '_key', `${path}._key`, issues),
    heading: requiredString(input, 'heading', `${path}.heading`, issues),
    paragraphs,
  };
}

export function mapMarketingPageDocument(
  input: unknown,
): ContentMappingResult<MarketingPageViewModel> {
  const issues: ContentContractIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ code: 'document', path: '' }] };
  }
  if (input._type !== 'marketingPage') {
    issues.push({ code: 'document_type', path: '_type' });
  }
  if (input.schemaVersion !== 1) {
    issues.push({ code: 'schema_version', path: 'schemaVersion' });
  }
  if (input.status !== 'published') {
    issues.push({ code: 'status', path: 'status' });
  }
  if (input.template !== 'legal.v1') {
    issues.push({ code: 'template', path: 'template' });
  }

  const slug = mapSlug(input, 'slug', 'slug', issues, {
    reserved: marketingPageReservedSlugs,
  });
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
  const keys = sections.map(({ key }) => key);
  if (new Set(keys).size !== keys.length) {
    issues.push({ code: 'section_key', path: 'sections' });
  }

  const canonicalPath = `/${slug}/` as const;
  const value: MarketingPageViewModel = {
    status: 'published',
    template: 'legal.v1',
    slug,
    title: requiredString(input, 'title', 'title', issues),
    introduction: requiredString(input, 'introduction', 'introduction', issues),
    effectiveDate: mapEffectiveDate(input.effectiveDate, issues),
    sections,
    seo: mapSeo(input.seo, 'seo', canonicalPath, issues),
  };
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value };
}

export function mapPublishedMarketingPageDocuments(
  inputs: readonly unknown[],
): MarketingPageViewModel[] {
  const publishedSlugs = new Set<string>();
  return inputs.flatMap((input, documentIndex) => {
    if (isRecord(input) && input.status === 'draft') return [];
    const result = mapMarketingPageDocument(input);
    if (!result.ok) {
      throw new ContentContractError(
        'MarketingPage',
        result.issues,
        documentIndex,
      );
    }
    if (publishedSlugs.has(result.value.slug)) {
      throw new ContentContractError(
        'MarketingPage',
        [{ code: 'duplicate_slug', path: 'slug' }],
        documentIndex,
      );
    }
    publishedSlugs.add(result.value.slug);
    return [result.value];
  });
}
