export const ANALYTICS_CONSENT_STORAGE_KEY = 'mini-workout:analytics-consent';
export const ANALYTICS_CONSENT_EVENT = 'mini-workout:analytics-consent-change';

export type AnalyticsConsentPreference = 'granted' | 'denied';

export function shouldRenderAnalyticsConsent(
  analyticsEnabled: boolean,
  approvedContent: unknown,
): boolean {
  return (
    analyticsEnabled &&
    approvedContent !== null &&
    approvedContent !== undefined
  );
}

interface ConsentStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function readConsentPreference(
  storage: ConsentStorage,
): AnalyticsConsentPreference | null {
  try {
    const value = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function saveConsentPreference(
  storage: ConsentStorage,
  preference: AnalyticsConsentPreference,
  announce: (
    eventName: typeof ANALYTICS_CONSENT_EVENT,
    preference: AnalyticsConsentPreference,
  ) => void,
): boolean {
  try {
    storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, preference);
  } catch {
    return false;
  }
  announce(ANALYTICS_CONSENT_EVENT, preference);
  return true;
}

export function createConsentGatedStart(dependencies: {
  hasConsent: () => boolean;
  start: () => Promise<void>;
}): () => Promise<boolean> {
  let started: Promise<void> | undefined;
  return async () => {
    if (!dependencies.hasConsent()) return false;
    started ??= dependencies.start();
    try {
      await started;
      return true;
    } catch {
      started = undefined;
      return false;
    }
  };
}
