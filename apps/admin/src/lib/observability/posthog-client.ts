import {
  type AnalyticsClient,
  type AnalyticsProperties,
  type PostHogBrowserSdk,
  createPostHogBrowserAdapter,
} from '@mini-workout/analytics';

export type SafeProperties = AnalyticsProperties;
export type PostHogSdk = PostHogBrowserSdk;
export type { AnalyticsClient };
export { createPostHogBrowserAdapter as createPostHogAdapter };
