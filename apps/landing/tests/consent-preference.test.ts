import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  createConsentGatedStart,
  readConsentPreference,
  saveConsentPreference,
  shouldRenderAnalyticsConsent,
} from '../src/analytics/consent-preference.js';
import { describe, expect, it, vi } from 'vitest';

describe('analytics consent preference', () => {
  it('renders only when analytics and approved content are both present', () => {
    expect(shouldRenderAnalyticsConsent(false, {})).toBe(false);
    expect(shouldRenderAnalyticsConsent(true, null)).toBe(false);
    expect(shouldRenderAnalyticsConsent(true, {})).toBe(true);
  });

  it.each([
    ['granted', 'granted'],
    ['denied', 'denied'],
    ['unknown', null],
    [null, null],
  ] as const)('reads only the bounded %s value', (stored, expected) => {
    expect(
      readConsentPreference({
        getItem: vi.fn().mockReturnValue(stored),
        setItem: vi.fn(),
      }),
    ).toBe(expected);
  });

  it('fails closed when browser storage is unavailable', () => {
    expect(
      readConsentPreference({
        getItem: vi.fn(() => {
          throw new Error('blocked');
        }),
        setItem: vi.fn(),
      }),
    ).toBeNull();
  });

  it.each(['granted', 'denied'] as const)(
    'persists %s and announces the bounded preference',
    (preference) => {
      const storage = { getItem: vi.fn(), setItem: vi.fn() };
      const announce = vi.fn();

      expect(saveConsentPreference(storage, preference, announce)).toBe(true);
      expect(storage.setItem).toHaveBeenCalledWith(
        ANALYTICS_CONSENT_STORAGE_KEY,
        preference,
      );
      expect(announce).toHaveBeenCalledWith(
        ANALYTICS_CONSENT_EVENT,
        preference,
      );
    },
  );

  it('does not announce a choice that could not be persisted', () => {
    const announce = vi.fn();
    expect(
      saveConsentPreference(
        {
          getItem: vi.fn(),
          setItem: vi.fn(() => {
            throw new Error('blocked');
          }),
        },
        'granted',
        announce,
      ),
    ).toBe(false);
    expect(announce).not.toHaveBeenCalled();
  });

  it('starts the runtime once after consent becomes granted', async () => {
    let preference: 'granted' | 'denied' | null = null;
    const start = vi.fn().mockResolvedValue(undefined);
    const startIfConsented = createConsentGatedStart({
      hasConsent: () => preference === 'granted',
      start,
    });

    await expect(startIfConsented()).resolves.toBe(false);
    preference = 'granted';
    await expect(startIfConsented()).resolves.toBe(true);
    await expect(startIfConsented()).resolves.toBe(true);
    expect(start).toHaveBeenCalledOnce();
  });
});
