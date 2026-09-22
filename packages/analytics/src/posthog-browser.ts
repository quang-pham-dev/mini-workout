import {
  type AnalyticsClient,
  type PostHogBrowserSdk,
  createPostHogBrowserAdapter,
} from './index';
import posthog from 'posthog-js';

export function createPostHogBrowserClient(
  key: string | undefined,
  host?: string,
  options?: { enabled?: boolean; hasConsent?: () => boolean },
): AnalyticsClient {
  return createPostHogBrowserAdapter(
    posthog as unknown as PostHogBrowserSdk,
    key,
    host,
    options,
  );
}
