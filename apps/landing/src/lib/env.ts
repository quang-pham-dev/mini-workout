const defaultSiteUrl = 'https://example.com/';
const invalidSiteUrlMessage =
  'LANDING_SITE_URL must be an HTTP(S) origin without credentials or a path.';

export interface LandingEnv {
  siteUrl: string;
  indexable: boolean;
}

export function parseLandingEnv(
  env: Partial<
    Pick<
      NodeJS.ProcessEnv,
      'LANDING_INDEXING_ENABLED' | 'LANDING_SITE_URL' | 'VERCEL_ENV'
    >
  >,
): LandingEnv {
  const configuredSiteUrl = env.LANDING_SITE_URL ?? defaultSiteUrl;
  let parsed: URL;

  try {
    parsed = new URL(configuredSiteUrl);
  } catch (cause) {
    throw new Error(invalidSiteUrlMessage, { cause });
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.pathname !== '/' ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0
  ) {
    throw new Error(invalidSiteUrlMessage);
  }

  return {
    siteUrl: parsed.toString(),
    indexable:
      env.VERCEL_ENV === 'production' &&
      env.LANDING_INDEXING_ENABLED === 'true',
  };
}
