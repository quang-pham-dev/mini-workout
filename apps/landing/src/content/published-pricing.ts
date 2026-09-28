import type {
  PricingBilling,
  PricingConversionCta,
  PricingFaqItem,
  PricingPlan,
  PricingViewModel,
} from '../features/pricing/catalog.js';
import {
  ContentContractError,
  type ContentContractIssue,
  type ContentMappingResult,
  isRecord,
  mapSeo,
  mapSlug,
  requiredString,
} from './validation-primitives.js';

function mapConversionCta(
  input: unknown,
  path: string,
  issues: ContentContractIssue[],
): PricingConversionCta {
  if (!isRecord(input)) {
    issues.push({ code: 'conversion_cta', path });
    return { label: '', action: 'register' };
  }
  const label = requiredString(input, 'label', `${path}.label`, issues);
  if (input.action !== 'login' && input.action !== 'register') {
    issues.push({ code: 'conversion_action', path: `${path}.action` });
    return { label, action: 'register' };
  }
  return { label, action: input.action };
}

function mapBilling(
  input: unknown,
  path: string,
  issues: ContentContractIssue[],
): PricingBilling {
  if (!isRecord(input)) {
    issues.push({ code: 'billing', path });
    return { cadence: 'one_time' };
  }
  if (input.cadence === 'one_time') {
    if (input.interval !== undefined) {
      issues.push({ code: 'billing_interval', path: `${path}.interval` });
    }
    return { cadence: 'one_time' };
  }
  if (input.cadence !== 'month' && input.cadence !== 'year') {
    issues.push({ code: 'billing_cadence', path: `${path}.cadence` });
    return { cadence: 'month', interval: 1 };
  }
  if (!Number.isInteger(input.interval) || Number(input.interval) <= 0) {
    issues.push({ code: 'billing_interval', path: `${path}.interval` });
    return { cadence: input.cadence, interval: 1 };
  }
  return { cadence: input.cadence, interval: Number(input.interval) };
}

function mapEntitlements(
  input: unknown,
  path: string,
  issues: ContentContractIssue[],
): PricingPlan['entitlements'] {
  if (!Array.isArray(input) || input.length === 0) {
    issues.push({ code: 'entitlements', path });
    return [];
  }
  const entitlements = input.flatMap((candidate, index) => {
    if (!isRecord(candidate)) {
      issues.push({ code: 'entitlement', path: `${path}.${index}` });
      return [];
    }
    return [
      {
        key: requiredString(candidate, '_key', `${path}.${index}._key`, issues),
        label: requiredString(
          candidate,
          'label',
          `${path}.${index}.label`,
          issues,
        ),
      },
    ];
  });
  if (
    new Set(entitlements.map(({ key }) => key)).size !== entitlements.length
  ) {
    issues.push({ code: 'entitlement_key', path });
  }
  return entitlements;
}

function mapPlans(
  input: unknown,
  issues: ContentContractIssue[],
): readonly PricingPlan[] {
  if (!Array.isArray(input) || input.length === 0) {
    issues.push({ code: 'plans', path: 'plans' });
    return [];
  }
  const seenPlanIds = new Set<string>();
  const plans = input.flatMap((candidate, index) => {
    const path = `plans.${index}`;
    if (!isRecord(candidate)) {
      issues.push({ code: 'plan', path });
      return [];
    }
    const planId = mapSlug(candidate, 'planId', `${path}.planId`, issues);
    if (seenPlanIds.has(planId)) {
      issues.push({ code: 'duplicate_plan_id', path: `${path}.planId` });
    }
    seenPlanIds.add(planId);
    if (
      !Number.isInteger(candidate.amountMinor) ||
      Number(candidate.amountMinor) < 0
    ) {
      issues.push({ code: 'amount_minor', path: `${path}.amountMinor` });
    }
    if (typeof candidate.recommended !== 'boolean') {
      issues.push({ code: 'recommended', path: `${path}.recommended` });
    }
    return [
      {
        key: requiredString(candidate, '_key', `${path}._key`, issues),
        planId,
        name: requiredString(candidate, 'name', `${path}.name`, issues),
        summary: requiredString(
          candidate,
          'summary',
          `${path}.summary`,
          issues,
        ),
        amountMinor: Number(candidate.amountMinor),
        billing: mapBilling(candidate.billing, `${path}.billing`, issues),
        entitlements: mapEntitlements(
          candidate.entitlements,
          `${path}.entitlements`,
          issues,
        ),
        cta: mapConversionCta(candidate.cta, `${path}.cta`, issues),
        recommended: candidate.recommended === true,
      },
    ];
  });
  if (plans.filter(({ recommended }) => recommended).length > 1) {
    issues.push({ code: 'recommended_plan', path: 'plans' });
  }
  if (new Set(plans.map(({ key }) => key)).size !== plans.length) {
    issues.push({ code: 'plan_key', path: 'plans' });
  }
  return plans;
}

function mapFaq(
  input: unknown,
  issues: ContentContractIssue[],
): readonly PricingFaqItem[] {
  if (!Array.isArray(input) || input.length === 0) {
    issues.push({ code: 'faq', path: 'faq' });
    return [];
  }
  const items = input.flatMap((candidate, index) => {
    const path = `faq.${index}`;
    if (!isRecord(candidate)) {
      issues.push({ code: 'faq_item', path });
      return [];
    }
    return [
      {
        key: requiredString(candidate, '_key', `${path}._key`, issues),
        question: requiredString(
          candidate,
          'question',
          `${path}.question`,
          issues,
        ),
        answer: requiredString(candidate, 'answer', `${path}.answer`, issues),
      },
    ];
  });
  if (new Set(items.map(({ key }) => key)).size !== items.length) {
    issues.push({ code: 'faq_key', path: 'faq' });
  }
  return items;
}

export function mapPricingDocument(
  input: unknown,
): ContentMappingResult<PricingViewModel> {
  const issues: ContentContractIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ code: 'document', path: '' }] };
  }
  if (input._type !== 'pricingPage') {
    issues.push({ code: 'document_type', path: '_type' });
  }
  if (input.schemaVersion !== 1) {
    issues.push({ code: 'schema_version', path: 'schemaVersion' });
  }
  if (input.status !== 'published') {
    issues.push({ code: 'status', path: 'status' });
  }
  const currencyCode = requiredString(
    input,
    'currencyCode',
    'currencyCode',
    issues,
  );
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    issues.push({ code: 'currency_code', path: 'currencyCode' });
  }
  if (
    !Number.isInteger(input.currencyMinorUnit) ||
    Number(input.currencyMinorUnit) < 0 ||
    Number(input.currencyMinorUnit) > 3
  ) {
    issues.push({ code: 'currency_minor_unit', path: 'currencyMinorUnit' });
  }
  const locale = requiredString(input, 'locale', 'locale', issues);
  if (!/^[a-z]{2,3}(?:-[A-Z]{2})$/.test(locale)) {
    issues.push({ code: 'locale', path: 'locale' });
  }
  if (
    /^[A-Z]{3}$/.test(currencyCode) &&
    /^[a-z]{2,3}(?:-[A-Z]{2})$/.test(locale) &&
    Number.isInteger(input.currencyMinorUnit)
  ) {
    try {
      const fractionDigits = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
      }).resolvedOptions().maximumFractionDigits;
      if (fractionDigits !== input.currencyMinorUnit) {
        issues.push({
          code: 'currency_minor_unit',
          path: 'currencyMinorUnit',
        });
      }
    } catch {
      issues.push({ code: 'currency_code', path: 'currencyCode' });
    }
  }

  const value: PricingViewModel = {
    status: 'published',
    title: requiredString(input, 'title', 'title', issues),
    introduction: requiredString(input, 'introduction', 'introduction', issues),
    currencyCode,
    currencyMinorUnit: Number(input.currencyMinorUnit),
    locale,
    plans: mapPlans(input.plans, issues),
    faq: mapFaq(input.faq, issues),
    cancellationTerms: requiredString(
      input,
      'cancellationTerms',
      'cancellationTerms',
      issues,
    ),
    refundTerms: requiredString(input, 'refundTerms', 'refundTerms', issues),
    seo: mapSeo(input.seo, 'seo', '/pricing/', issues),
  };
  return issues.length ? { ok: false, issues } : { ok: true, value };
}

export function mapPublishedPricingDocuments(
  inputs: readonly unknown[],
): PricingViewModel | null {
  const published = inputs.filter(
    (input) => !isRecord(input) || input.status !== 'draft',
  );
  if (published.length === 0) return null;
  if (published.length > 1) {
    throw new ContentContractError(
      'Pricing',
      [{ code: 'singleton', path: '' }],
      1,
    );
  }
  const result = mapPricingDocument(published[0]);
  if (!result.ok) throw new ContentContractError('Pricing', result.issues, 0);
  return result.value;
}
