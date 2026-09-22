import {
  type AnalyticsClient,
  type AnalyticsProperties,
  type PostHogBrowserSdk,
  createPostHogBrowserAdapter,
} from '@mini-workout/analytics';
import { createPostHogBrowserClient } from '@mini-workout/analytics/posthog-browser';

export type SafePostHogProperties = AnalyticsProperties;
export type PostHogSdk = PostHogBrowserSdk;
export { createPostHogBrowserAdapter as createPostHogAdapter };

export const posthogClient: AnalyticsClient = createPostHogBrowserClient(
  process.env.POSTHOG_KEY,
  process.env.POSTHOG_HOST,
  {
    enabled: process.env.POSTHOG_ENABLED !== 'false',
    hasConsent: () =>
      process.env.POSTHOG_REQUIRE_CONSENT !== 'true' ||
      window.localStorage.getItem('mini-workout:analytics-consent') ===
        'granted',
  },
);
