'use client';

import {
  type SafeProperties,
  createPostHogAdapter,
} from '@/lib/observability/posthog-client';
import { useEffect } from 'react';

const errorEventName = 'mini-workout:admin-error';
type AdminErrorDetail = {
  error: Error;
  properties: SafeProperties;
};

let adapterPromise: Promise<ReturnType<typeof createPostHogAdapter> | null>;

function getPostHogClient() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  adapterPromise ??= fetch('/api/observability-config', {
    headers: { accept: 'application/json' },
  })
    .then((response) => (response.ok ? response.json() : null))
    .then(
      (
        config: {
          key?: string;
          host?: string;
          enabled?: boolean;
          requireConsent?: boolean;
        } | null,
      ) =>
        config?.key
          ? import('posthog-js').then(({ default: sdk }) =>
              createPostHogAdapter(sdk, config.key, config.host, {
                enabled: config.enabled,
                hasConsent: () =>
                  !config.requireConsent ||
                  window.localStorage.getItem(
                    'mini-workout:analytics-consent',
                  ) === 'granted',
              }),
            )
          : null,
    )
    .catch(() => null);
  return adapterPromise;
}

export function PostHogBootstrap() {
  useEffect(() => {
    void getPostHogClient().then((client) => client?.initialize());

    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<AdminErrorDetail>).detail;
      if (!detail?.error) return;
      void getPostHogClient().then((client) =>
        client?.captureException(detail.error, detail.properties),
      );
    };
    window.addEventListener(errorEventName, handleError);
    return () => window.removeEventListener(errorEventName, handleError);
  }, []);

  return null;
}

export function PostHogIdentitySync({ userId }: { userId?: string }) {
  useEffect(() => {
    if (userId) {
      void getPostHogClient().then((client) => client?.identify(userId));
    } else {
      void getPostHogClient().then((client) => client?.reset());
    }
  }, [userId]);

  return null;
}
