import { createLandingSecurityHeaders } from '../rollout/security-headers';
import { defineMiddleware } from 'astro:middleware';

const securityHeaders = createLandingSecurityHeaders({
  mode: 'preview',
  studioOrigin: import.meta.env.SANITY_STUDIO_URL,
  ...(import.meta.env.SANITY_PROJECT_ID
    ? { sanityProjectId: import.meta.env.SANITY_PROJECT_ID }
    : {}),
  analytics: {
    enabled: import.meta.env.LANDING_ANALYTICS_ENABLED,
    host: import.meta.env.LANDING_POSTHOG_HOST,
  },
});

export const onRequest = defineMiddleware(async (_, next) => {
  const response = await next();
  response.headers.set('cache-control', 'private, no-store');
  response.headers.set('x-robots-tag', 'noindex, nofollow');
  for (const [name, value] of Object.entries(securityHeaders)) {
    response.headers.set(name, value);
  }
  return response;
});
