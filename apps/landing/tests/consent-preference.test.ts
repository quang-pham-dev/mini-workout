import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  readConsentPreference,
  saveConsentPreference,
} from '../src/analytics/consent-preference.js';
import { describe, expect, it, vi } from 'vitest';

describe('analytics consent preference', () => {
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
});
