# `@mini-workout/analytics`

Provider-neutral analytics and server feature-flag adapters.

Application and domain code should depend on `AnalyticsClient` or
`FeatureFlagProvider`; only this package imports PostHog SDKs. Both browser and
server exception adapters allowlist context and replace raw exceptions with a
stable error code before sending data.

Server feature flags use a bounded in-memory cache. The default decision TTL is
45 seconds and provider failures resolve to `false` through the shared reader.
The cache is process-local and is an optimization, not a source of truth.

```ts
import { createPostHogFeatureFlagProviderFromConfig } from '@mini-workout/analytics/server';

const provider = createPostHogFeatureFlagProviderFromConfig({
  apiKey: process.env.POSTHOG_SERVER_API_KEY,
  keyMap: { 'auth.emailVerification': 'auth-email-verification' },
});
```
