import type { PricingBilling } from './catalog.js';

interface PricingAmountInput {
  amountMinor: number;
  currencyCode: string;
  currencyMinorUnit: number;
  locale: string;
}

export function formatPricingAmount({
  amountMinor,
  currencyCode,
  currencyMinorUnit,
  locale,
}: PricingAmountInput): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyMinorUnit,
    maximumFractionDigits: currencyMinorUnit,
  }).format(amountMinor / 10 ** currencyMinorUnit);
}

export function formatBillingCadence(billing: PricingBilling): string {
  if (billing.cadence === 'one_time') return 'one time';
  if (billing.interval === 1) return `every ${billing.cadence}`;
  return `every ${billing.interval} ${billing.cadence}s`;
}
