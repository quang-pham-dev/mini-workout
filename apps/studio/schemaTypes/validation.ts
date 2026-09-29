export function validateSlug(value: unknown): boolean {
  const slug =
    typeof value === 'string'
      ? value
      : typeof value === 'object' &&
          value !== null &&
          'current' in value &&
          typeof value.current === 'string'
        ? value.current
        : '';
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

const marketingPageReservedSlugs = new Set([
  '404',
  'api',
  'articles',
  'campaigns',
  'movement',
  'pricing',
  'robots',
  'sitemap',
]);

export function validateMarketingPageSlug(value: unknown): boolean {
  const slug =
    typeof value === 'string'
      ? value
      : typeof value === 'object' &&
          value !== null &&
          'current' in value &&
          typeof value.current === 'string'
        ? value.current
        : '';
  return validateSlug(value) && !marketingPageReservedSlugs.has(slug);
}

export function validateIsoDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function validateLegalPageSections(value: unknown): boolean {
  return (
    hasUniqueKeys(value) &&
    (value as Array<Record<string, unknown>>).every(
      ({ _type }) => _type === 'legalSectionV1',
    )
  );
}

export function validateInternalHref(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (value.includes('?') || value.includes('\\')) return false;

  const [pathname = '', fragment, extra] = value.split('#');
  if (extra !== undefined) return false;
  if (fragment !== undefined && !/^[a-zA-Z][\w-]*$/.test(fragment)) {
    return false;
  }

  return pathname
    .split('/')
    .every(
      (segment) =>
        segment.length === 0 ||
        (/^[a-zA-Z0-9_-]+$/.test(segment) &&
          segment !== '.' &&
          segment !== '..'),
    );
}

export function validateCampaignSchedule(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const { startsAt, endsAt } = value as Record<string, unknown>;
  if (typeof startsAt !== 'string' || typeof endsAt !== 'string') return false;
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return (
    !Number.isNaN(start.valueOf()) &&
    !Number.isNaN(end.valueOf()) &&
    start.toISOString() === startsAt &&
    end.toISOString() === endsAt &&
    start < end
  );
}

export function validateCampaignExpiryPolicy(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const { mode, successor } = value as Record<string, unknown>;
  if (mode === 'redirect') {
    return (
      typeof successor === 'object' &&
      successor !== null &&
      typeof (successor as Record<string, unknown>).label === 'string' &&
      validateInternalHref((successor as Record<string, unknown>).href)
    );
  }
  return (mode === 'gone' || mode === 'archive') && successor === undefined;
}

const campaignSectionTypes = new Set([
  'campaignHeroV1',
  'campaignBenefitsV1',
  'campaignFaqV1',
  'campaignCtaV1',
]);

function hasUniqueKeys(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  const keys = value.map((candidate) =>
    typeof candidate === 'object' && candidate !== null
      ? (candidate as Record<string, unknown>)._key
      : undefined,
  );
  return (
    keys.every((key) => typeof key === 'string' && key.length > 0) &&
    new Set(keys).size === keys.length
  );
}

export function validateCampaignSections(value: unknown): boolean {
  if (!hasUniqueKeys(value)) return false;
  const sections = value as Array<Record<string, unknown>>;
  if (
    sections.some(
      ({ _type }) =>
        typeof _type !== 'string' || !campaignSectionTypes.has(_type),
    )
  ) {
    return false;
  }
  const heroCount = sections.filter(
    ({ _type }) => _type === 'campaignHeroV1',
  ).length;
  const ctaCount = sections.filter(
    ({ _type }) => _type === 'campaignCtaV1',
  ).length;
  if (
    heroCount !== 1 ||
    sections[0]?._type !== 'campaignHeroV1' ||
    ctaCount > 1
  ) {
    return false;
  }
  return sections.every(({ _type, items }) =>
    _type === 'campaignBenefitsV1' || _type === 'campaignFaqV1'
      ? hasUniqueKeys(items)
      : true,
  );
}

export function validatePricingCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

export function validatePricingLocale(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z]{2,3}-[A-Z]{2}$/.test(value);
}

export function validatePricingBilling(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const { cadence, interval } = value as Record<string, unknown>;
  if (cadence === 'one_time') return interval === undefined;
  return (
    (cadence === 'month' || cadence === 'year') &&
    Number.isInteger(interval) &&
    Number(interval) > 0
  );
}

export function validatePricingDocument(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const document = value as Record<string, unknown>;
  const { currencyCode, currencyMinorUnit, locale, plans } = document;
  const isText = (candidate: unknown) =>
    typeof candidate === 'string' && candidate.trim().length > 0;
  if (
    !isText(document.title) ||
    !isText(document.introduction) ||
    !isText(document.cancellationTerms) ||
    !isText(document.refundTerms) ||
    !validatePricingCurrencyCode(currencyCode) ||
    !Number.isInteger(currencyMinorUnit) ||
    Number(currencyMinorUnit) < 0 ||
    Number(currencyMinorUnit) > 3 ||
    !validatePricingLocale(locale) ||
    !Array.isArray(plans) ||
    plans.length === 0
  ) {
    return false;
  }
  try {
    const fractionDigits = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).resolvedOptions().maximumFractionDigits;
    if (fractionDigits !== currencyMinorUnit) return false;
  } catch {
    return false;
  }

  const planIds = new Set<string>();
  const planKeys = new Set<string>();
  let recommendations = 0;
  for (const candidate of plans) {
    if (typeof candidate !== 'object' || candidate === null) return false;
    const plan = candidate as Record<string, unknown>;
    const { planId, amountMinor, billing, recommended } = plan;
    if (
      !isText(plan._key) ||
      planKeys.has(String(plan._key)) ||
      typeof planId !== 'string' ||
      !validateSlug(planId) ||
      planIds.has(planId) ||
      !Number.isInteger(amountMinor) ||
      Number(amountMinor) < 0 ||
      typeof recommended !== 'boolean' ||
      typeof billing !== 'object' ||
      billing === null ||
      !isText(plan.name) ||
      !isText(plan.summary) ||
      typeof plan.cta !== 'object' ||
      plan.cta === null ||
      !isText((plan.cta as Record<string, unknown>).label) ||
      !['login', 'register'].includes(
        String((plan.cta as Record<string, unknown>).action),
      ) ||
      !Array.isArray(plan.entitlements) ||
      plan.entitlements.length === 0
    ) {
      return false;
    }
    planKeys.add(String(plan._key));
    planIds.add(planId);
    if (recommended) recommendations += 1;
    if (!validatePricingBilling(billing)) return false;

    const entitlementKeys = new Set<string>();
    for (const entitlement of plan.entitlements) {
      if (typeof entitlement !== 'object' || entitlement === null) return false;
      const item = entitlement as Record<string, unknown>;
      if (
        !isText(item._key) ||
        entitlementKeys.has(String(item._key)) ||
        !isText(item.label)
      ) {
        return false;
      }
      entitlementKeys.add(String(item._key));
    }
  }
  if (recommendations > 1) return false;
  if (!Array.isArray(document.faq) || document.faq.length === 0) return false;
  const faqKeys = new Set<string>();
  return document.faq.every((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) return false;
    const item = candidate as Record<string, unknown>;
    if (
      !isText(item._key) ||
      faqKeys.has(String(item._key)) ||
      !isText(item.question) ||
      !isText(item.answer)
    ) {
      return false;
    }
    faqKeys.add(String(item._key));
    return true;
  });
}
