# `@mini-workout/analytics`

Provider-neutral analytics and server feature-flag adapters.

Application and domain code should depend on `AnalyticsClient` or
`FeatureFlagProvider`; only this package imports PostHog SDKs. Both browser and
server exception adapters allowlist context and replace raw exceptions with a
stable error code before sending data.

Product events use the `@mini-workout/analytics/product-events` entrypoint. Its
runtime schema currently owns `landing_page_view`, `cta_clicked`,
`campaign_view`, `experiment_exposure` and `content_engaged`. Unknown events,
missing required fields, arbitrary properties, URLs, query strings and
unbounded values fail closed before reaching the provider. Feature code should
call `captureProductEvent`; it must not call the PostHog SDK directly.

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
