import { browserExperimentTargets } from '../experimentation/browser-experiment-targets';
import { landingExperimentRegistry } from '../experimentation/experiment-registry';
import { initializeLandingExperiments } from '../experimentation/experiment-runtime';
import {
  initializeLandingAnalytics,
  routeTemplateForPath,
} from './landing-analytics';

const consentStorageKey = 'mini-workout:analytics-consent';

function hasConsent(): boolean {
  try {
    return window.localStorage.getItem(consentStorageKey) === 'granted';
  } catch {
    return false;
  }
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

void initializeLandingAnalytics({
  enabled: import.meta.env.LANDING_ANALYTICS_ENABLED,
  hasConsent,
  loadClient: loadClientOnce,
  location: new URL(window.location.href),
  referrer: document.referrer,
  addEventListener: (name, listener) =>
    document.addEventListener(name, listener),
});

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

void initializeLandingExperiments({
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
});
