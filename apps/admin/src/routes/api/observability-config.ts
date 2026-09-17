import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/observability-config')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            key: process.env.VITE_POSTHOG_KEY,
            host: process.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
            enabled: process.env.VITE_POSTHOG_ENABLED !== 'false',
            requireConsent: process.env.VITE_POSTHOG_REQUIRE_CONSENT === 'true',
          },
          {
            headers: {
              'cache-control': 'public, max-age=300',
            },
          },
        ),
    },
  },
});
