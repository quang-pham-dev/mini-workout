'use client';

import { posthogClient } from '@/lib/observability/posthog-client';
import { useEffect } from 'react';

export function PostHogBootstrap() {
  useEffect(() => {
    posthogClient.initialize();
  }, []);

  return null;
}

export function PostHogIdentitySync({ userId }: { userId?: string }) {
  useEffect(() => {
    if (userId) {
      posthogClient.identify(userId);
    } else {
      // Session transitions to anonymous must clear the previous account
      // identity. The adapter keeps this best-effort and consent-aware.
      posthogClient.reset();
    }
  }, [userId]);

  return null;
}
