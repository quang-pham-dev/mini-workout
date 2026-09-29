import type { ReactNode } from 'react';

interface CampaignPreviewInput {
  title?: unknown;
  status?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  media?: ReactNode;
}

interface PricingPreviewInput {
  title?: unknown;
  status?: unknown;
  currencyCode?: unknown;
  plans?: unknown;
}

function label(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  return value.trim();
}

function lifecycleLabel(value: unknown): string {
  const status = label(value, 'draft');
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function dateLabel(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)
    ? value.slice(0, 10)
    : undefined;
}

export function prepareCampaignPreview(input: CampaignPreviewInput) {
  const start = dateLabel(input.startsAt);
  const end = dateLabel(input.endsAt);
  const schedule = start && end ? ` · ${start} → ${end}` : '';
  return {
    title: label(input.title, 'Untitled Campaign'),
    subtitle: `${lifecycleLabel(input.status)}${schedule}`,
    ...(input.media === undefined ? {} : { media: input.media }),
  };
}

export function preparePricingPreview(input: PricingPreviewInput) {
  const planCount = Array.isArray(input.plans) ? input.plans.length : 0;
  const planLabel = `${planCount} ${planCount === 1 ? 'plan' : 'plans'}`;
  const currency =
    typeof input.currencyCode === 'string' && input.currencyCode.length > 0
      ? ` · ${input.currencyCode}`
      : '';
  return {
    title: label(input.title, 'Pricing'),
    subtitle: `${lifecycleLabel(input.status)} · ${planLabel}${currency}`,
  };
}
