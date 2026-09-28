import {
  formatBillingCadence,
  formatPricingAmount,
} from '../src/features/pricing/presentation.js';
import { describe, expect, it } from 'vitest';

describe('Pricing presentation', () => {
  it('formats exact minor-unit amounts with the approved currency and locale', () => {
    expect(
      formatPricingAmount({
        amountMinor: 1200,
        currencyCode: 'USD',
        currencyMinorUnit: 2,
        locale: 'en-US',
      }),
    ).toBe('$12.00');
    expect(
      formatPricingAmount({
        amountMinor: 1200,
        currencyCode: 'JPY',
        currencyMinorUnit: 0,
        locale: 'ja-JP',
      }),
    ).toBe('￥1,200');
  });

  it('describes explicit recurring and one-time cadence without savings claims', () => {
    expect(formatBillingCadence({ cadence: 'month', interval: 1 })).toBe(
      'every month',
    );
    expect(formatBillingCadence({ cadence: 'year', interval: 2 })).toBe(
      'every 2 years',
    );
    expect(formatBillingCadence({ cadence: 'one_time' })).toBe('one time');
  });
});
