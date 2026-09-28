import type {
  CampaignExpiryPolicy,
  CampaignViewModel,
} from '../features/campaigns/catalog.js';
import type { CampaignSection } from './campaign-section-registry.js';
import { isCampaignSectionKind } from './campaign-section-registry.js';
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

const reservedCampaignSlugs = [
  'admin',
  'api',
  'app',
  'articles',
  'movement',
  'pricing',
  'studio',
];

function mapConversionCta(
  input: unknown,
  path: string,
  issues: ContentContractIssue[],
): { label: string; action: 'login' | 'register' } {
  if (!isRecord(input)) {
    issues.push({ code: 'conversion_cta', path });
    return { label: '', action: 'register' };
  }
  const label = requiredString(input, 'label', `${path}.label`, issues);
  const action = input.action;
  if (action !== 'login' && action !== 'register') {
    issues.push({ code: 'conversion_action', path: `${path}.action` });
    return { label, action: 'register' };
  }
  return { label, action };
}

function mapUtcDate(
  input: Record<string, unknown>,
  key: 'startsAt' | 'endsAt',
  issues: ContentContractIssue[],
): string {
  const value = requiredString(input, key, key, issues);
  const date = new Date(value);
  if (!value || Number.isNaN(date.valueOf()) || date.toISOString() !== value) {
    if (value) issues.push({ code: 'campaign_date', path: key });
    return value;
  }
  return value;
}

function mapExpiryPolicy(
  input: unknown,
  issues: ContentContractIssue[],
): CampaignExpiryPolicy {
  if (!isRecord(input)) {
    issues.push({ code: 'expiry_policy', path: 'expiryPolicy' });
    return { mode: 'gone' };
  }
  const mode = input.mode;
  if (mode !== 'gone' && mode !== 'redirect' && mode !== 'archive') {
    issues.push({ code: 'expiry_mode', path: 'expiryPolicy.mode' });
    return { mode: 'gone' };
  }
  if (mode === 'redirect') {
    if (!isRecord(input.successor)) {
      issues.push({ code: 'expiry_successor', path: 'expiryPolicy.successor' });
      return {
        mode,
        successor: { label: '', href: '' },
      };
    }
    return {
      mode,
      successor: mapInternalLink(
        input.successor,
        'expiryPolicy.successor',
        issues,
      ),
    };
  }
  if (input.successor !== undefined) {
    issues.push({ code: 'expiry_successor', path: 'expiryPolicy.successor' });
  }
  return { mode };
}

function mapItems(
  value: unknown,
  path: string,
  fields: readonly [string, string],
  issues: ContentContractIssue[],
): readonly Readonly<{ key: string; first: string; second: string }>[] {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ code: 'section_items', path });
    return [];
  }
  const items = value.flatMap((item, index) => {
    if (!isRecord(item)) {
      issues.push({ code: 'section_item', path: `${path}.${index}` });
      return [];
    }
    return [
      {
        key: requiredString(item, '_key', `${path}.${index}._key`, issues),
        first: requiredString(
          item,
          fields[0],
          `${path}.${index}.${fields[0]}`,
          issues,
        ),
        second: requiredString(
          item,
          fields[1],
          `${path}.${index}.${fields[1]}`,
          issues,
        ),
      },
    ];
  });
  if (new Set(items.map(({ key }) => key)).size !== items.length) {
    issues.push({ code: 'section_item_key', path });
  }
  return items;
}

function mapSection(
  input: unknown,
  index: number,
  issues: ContentContractIssue[],
): CampaignSection | undefined {
  const path = `sections.${index}`;
  if (!isRecord(input)) {
    issues.push({ code: 'section', path });
    return undefined;
  }
  if (!isCampaignSectionKind(input._type)) {
    issues.push({ code: 'section_type', path: `${path}._type` });
    return undefined;
  }
  const key = requiredString(input, '_key', `${path}._key`, issues);
  const type = input._type;
  if (type === 'campaignHero.v1') {
    return {
      type,
      key,
      eyebrow: requiredString(input, 'eyebrow', `${path}.eyebrow`, issues),
      headline: requiredString(input, 'headline', `${path}.headline`, issues),
      introduction: requiredString(
        input,
        'introduction',
        `${path}.introduction`,
        issues,
      ),
      image: mapLocalMedia(input.image, `${path}.image`, issues),
      cta: mapConversionCta(input.cta, `${path}.cta`, issues),
    };
  }
  if (type === 'campaignBenefits.v1') {
    return {
      type,
      key,
      heading: requiredString(input, 'heading', `${path}.heading`, issues),
      items: mapItems(
        input.items,
        `${path}.items`,
        ['title', 'description'],
        issues,
      ).map(({ key: itemKey, first, second }) => ({
        key: itemKey,
        title: first,
        description: second,
      })),
    };
  }
  if (type === 'campaignFaq.v1') {
    return {
      type,
      key,
      heading: requiredString(input, 'heading', `${path}.heading`, issues),
      items: mapItems(
        input.items,
        `${path}.items`,
        ['question', 'answer'],
        issues,
      ).map(({ key: itemKey, first, second }) => ({
        key: itemKey,
        question: first,
        answer: second,
      })),
    };
  }
  return {
    type,
    key,
    heading: requiredString(input, 'heading', `${path}.heading`, issues),
    copy: requiredString(input, 'copy', `${path}.copy`, issues),
    cta: mapConversionCta(input.cta, `${path}.cta`, issues),
  };
}

export function mapCampaignDocument(
  input: unknown,
): ContentMappingResult<CampaignViewModel> {
  const issues: ContentContractIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ code: 'document', path: '' }] };
  }
  if (input._type !== 'campaignPage')
    issues.push({ code: 'document_type', path: '_type' });
  if (input.schemaVersion !== 1)
    issues.push({ code: 'schema_version', path: 'schemaVersion' });
  if (input.status !== 'published')
    issues.push({ code: 'status', path: 'status' });

  const slug = mapSlug(input, 'slug', 'slug', issues, {
    reserved: reservedCampaignSlugs,
  });
  const campaignId = mapSlug(input, 'campaignId', 'campaignId', issues);
  const startsAt = mapUtcDate(input, 'startsAt', issues);
  const endsAt = mapUtcDate(input, 'endsAt', issues);
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
    issues.push({ code: 'campaign_schedule', path: 'startsAt' });
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
  const rawSectionKeys = Array.isArray(sectionValues)
    ? sectionValues.flatMap((section) =>
        isRecord(section) && typeof section._key === 'string'
          ? [section._key]
          : [],
      )
    : [];
  if (new Set(rawSectionKeys).size !== rawSectionKeys.length) {
    issues.push({ code: 'section_key', path: 'sections' });
  }
  const heroSections = sections.filter(
    ({ type }) => type === 'campaignHero.v1',
  );
  if (heroSections.length !== 1 || sections[0]?.type !== 'campaignHero.v1') {
    issues.push({ code: 'campaign_hero', path: 'sections' });
  }
  if (sections.filter(({ type }) => type === 'campaignCta.v1').length > 1) {
    issues.push({ code: 'campaign_cta', path: 'sections' });
  }

  const value: CampaignViewModel = {
    campaignId,
    slug,
    status: 'published',
    title: requiredString(input, 'title', 'title', issues),
    audienceDescription: requiredString(
      input,
      'audienceDescription',
      'audienceDescription',
      issues,
    ),
    startsAt,
    endsAt,
    expiryPolicy: mapExpiryPolicy(input.expiryPolicy, issues),
    sections,
    seo: mapSeo(input.seo, 'seo', `/campaigns/${slug}/` as const, issues),
  };
  return issues.length ? { ok: false, issues } : { ok: true, value };
}

export function classifyCampaignLifecycle(
  campaign: Pick<CampaignViewModel, 'startsAt' | 'endsAt'>,
  now: Date,
): 'scheduled' | 'active' | 'expired' {
  if (now < new Date(campaign.startsAt)) return 'scheduled';
  if (now >= new Date(campaign.endsAt)) return 'expired';
  return 'active';
}

export function mapPublishedCampaignDocuments(
  inputs: readonly unknown[],
): CampaignViewModel[] {
  const slugs = new Set<string>();
  const campaignIds = new Set<string>();
  return inputs.flatMap((input, documentIndex) => {
    if (isRecord(input) && input.status === 'draft') return [];
    const result = mapCampaignDocument(input);
    if (!result.ok)
      throw new ContentContractError('Campaign', result.issues, documentIndex);
    const issues: ContentContractIssue[] = [];
    if (slugs.has(result.value.slug))
      issues.push({ code: 'duplicate_slug', path: 'slug' });
    if (campaignIds.has(result.value.campaignId))
      issues.push({ code: 'duplicate_campaign_id', path: 'campaignId' });
    if (issues.length)
      throw new ContentContractError('Campaign', issues, documentIndex);
    slugs.add(result.value.slug);
    campaignIds.add(result.value.campaignId);
    return [result.value];
  });
}
