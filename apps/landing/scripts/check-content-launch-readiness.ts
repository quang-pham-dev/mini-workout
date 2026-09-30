import { parseLandingEnv } from '../src/lib/env.js';
import {
  assessLandingContentLaunchReadiness,
  parseLaunchSurfaces,
} from '../src/operations/content-launch-readiness.js';

let requiredSurfaces;
try {
  requiredSurfaces = parseLaunchSurfaces(process.argv.slice(2));
} catch {
  console.error('error:launch_readiness_arguments_invalid:arguments');
  process.exitCode = 1;
}

if (requiredSurfaces) {
  try {
    const landingEnv = requiredSurfaces.includes('analytics-consent')
      ? parseLandingEnv({
          LANDING_ANALYTICS_ENABLED: process.env.LANDING_ANALYTICS_ENABLED,
          LANDING_CONTENT_SOURCE: process.env.LANDING_CONTENT_SOURCE,
          LANDING_EXPERIMENTS_ENABLED: process.env.LANDING_EXPERIMENTS_ENABLED,
          LANDING_INDEXING_ENABLED: process.env.LANDING_INDEXING_ENABLED,
          LANDING_OUTPUT: process.env.LANDING_OUTPUT,
          LANDING_POSTHOG_HOST: process.env.LANDING_POSTHOG_HOST,
          LANDING_POSTHOG_KEY: process.env.LANDING_POSTHOG_KEY,
          LANDING_SITE_URL: process.env.LANDING_SITE_URL,
          MEMBER_APP_URL: process.env.MEMBER_APP_URL,
          SANITY_DATASET: process.env.SANITY_DATASET,
          SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
          SANITY_STUDIO_URL: process.env.SANITY_STUDIO_URL,
          STRAPI_API_URL: process.env.STRAPI_API_URL,
          STRAPI_API_READ_TOKEN: process.env.STRAPI_API_READ_TOKEN,
          VERCEL_ENV: process.env.VERCEL_ENV,
          VERCEL_PROJECT_PRODUCTION_URL:
            process.env.VERCEL_PROJECT_PRODUCTION_URL,
          VERCEL_URL: process.env.VERCEL_URL,
        })
      : undefined;
    const { publishedContentRepository } =
      await import('../src/content/published-content-repository.js');
    const content = await publishedContentRepository.load();
    const issues = assessLandingContentLaunchReadiness({
      content,
      now: new Date(),
      requiredSurfaces,
      ...(landingEnv
        ? {
            analytics: {
              enabled: landingEnv.analytics.enabled,
              experimentsEnabled: landingEnv.experimentsEnabled,
            },
          }
        : {}),
    });
    for (const issue of issues) {
      const output = `${issue.severity}:${issue.code}:${issue.path}`;
      if (issue.severity === 'error') console.error(output);
      else console.warn(output);
    }
    if (issues.some(({ severity }) => severity === 'error')) {
      process.exitCode = 1;
    } else {
      console.log(
        `Landing content launch readiness passed (${issues.length} warnings).`,
      );
    }
  } catch {
    console.error('error:landing_launch_readiness_failed:repository');
    process.exitCode = 1;
  }
}
