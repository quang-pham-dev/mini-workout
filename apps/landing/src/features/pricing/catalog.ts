import { mapPublishedPricingDocuments } from '../../content/published-pricing.js';
import type { SeoValue } from '../../content/validation-primitives.js';

export interface PricingConversionCta {
  label: string;
  action: 'login' | 'register';
}

export type PricingBilling =
  | Readonly<{ cadence: 'month' | 'year'; interval: number }>
  | Readonly<{ cadence: 'one_time' }>;

export interface PricingPlan {
  key: string;
  planId: string;
  name: string;
  summary: string;
  amountMinor: number;
  billing: PricingBilling;
  entitlements: readonly Readonly<{ key: string; label: string }>[];
  cta: PricingConversionCta;
  recommended: boolean;
}

export interface PricingFaqItem {
  key: string;
  question: string;
  answer: string;
}

export interface PricingViewModel {
  status: 'published';
  title: string;
  introduction: string;
  currencyCode: string;
  currencyMinorUnit: number;
  locale: string;
  plans: readonly PricingPlan[];
  faq: readonly PricingFaqItem[];
  cancellationTerms: string;
  refundTerms: string;
  seo: SeoValue<'/pricing/'>;
}

const pricingDocuments: readonly unknown[] = [];
const pricing = mapPublishedPricingDocuments(pricingDocuments);

export function getPublishedPricing(): PricingViewModel | null {
  return pricing;
}
