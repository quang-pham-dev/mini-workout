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
    typeof currencyCode !== 'string' ||
    !/^[A-Z]{3}$/.test(currencyCode) ||
    !Number.isInteger(currencyMinorUnit) ||
    Number(currencyMinorUnit) < 0 ||
    Number(currencyMinorUnit) > 3 ||
    typeof locale !== 'string' ||
    !/^[a-z]{2,3}-[A-Z]{2}$/.test(locale) ||
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
    const { cadence, interval } = billing as Record<string, unknown>;
    if (cadence === 'one_time') {
      if (interval !== undefined) return false;
    } else if (
      (cadence !== 'month' && cadence !== 'year') ||
      !Number.isInteger(interval) ||
      Number(interval) <= 0
    ) {
      return false;
    }

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
