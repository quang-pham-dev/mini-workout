import { browserExperimentTargets } from '../experimentation/browser-experiment-targets';
import { landingExperimentRegistry } from '../experimentation/experiment-registry';
import { initializeLandingExperiments } from '../experimentation/experiment-runtime';
import {
  ANALYTICS_CONSENT_EVENT,
  createConsentGatedStart,
  readConsentPreference,
} from './consent-preference';
import {
  initializeLandingAnalytics,
  routeTemplateForPath,
} from './landing-analytics';

function hasConsent(): boolean {
  return (
    document.querySelector('[data-analytics-consent]') !== null &&
    readConsentPreference(window.localStorage) === 'granted'
  );
}

const loadClient = async () => {
  const { createPostHogBrowserClient } =
    await import('@mini-workout/analytics/posthog-browser');
  return createPostHogBrowserClient(
    import.meta.env.LANDING_POSTHOG_KEY,
    import.meta.env.LANDING_POSTHOG_HOST,
    { enabled: true, hasConsent },
  );
};
const clientPromise = {
  current: undefined as ReturnType<typeof loadClient> | undefined,
};
const loadClientOnce = () => (clientPromise.current ??= loadClient());

const previewOverride = import.meta.env.LANDING_PREVIEW
  ? {
      experimentId: new URL(window.location.href).searchParams.get(
        'mw_experiment',
      ),
      variantId: new URL(window.location.href).searchParams.get('mw_variant'),
    }
  : undefined;
const forcedAssignment =
  previewOverride?.experimentId && previewOverride.variantId
    ? {
        experimentId: previewOverride.experimentId,
        variantId: previewOverride.variantId,
      }
    : undefined;

const startIfConsented = createConsentGatedStart({
  hasConsent,
  start: async () => {
    await Promise.all([
      initializeLandingAnalytics({
        enabled: import.meta.env.LANDING_ANALYTICS_ENABLED,
        hasConsent,
        loadClient: loadClientOnce,
        location: new URL(window.location.href),
        referrer: document.referrer,
        addEventListener: (name, listener) =>
          document.addEventListener(name, listener),
      }),
      initializeLandingExperiments({
        enabled: import.meta.env.LANDING_EXPERIMENTS_ENABLED,
        preview: import.meta.env.LANDING_PREVIEW,
        hasConsent,
        registry: landingExperimentRegistry,
        routeTemplate: routeTemplateForPath(window.location.pathname) ?? '',
        now: new Date(),
        storage: window.localStorage,
        createSubjectId: () => `anon_${window.crypto.randomUUID()}`,
        targets: browserExperimentTargets(),
        ...(forcedAssignment ? { forcedAssignment } : {}),
        loadClient: loadClientOnce,
      }),
    ]);
  },
});

void startIfConsented();
window.addEventListener(ANALYTICS_CONSENT_EVENT, (event) => {
  if (event instanceof CustomEvent && event.detail?.preference === 'granted') {
    void startIfConsented();
  }
});
