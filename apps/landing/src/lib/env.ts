const defaultSiteUrl = 'https://example.com/';
const defaultProductAppUrl = 'http://localhost:3000/';

function parseOrigin(value: string, variableName: string): string {
  const message = `${variableName} must be an HTTP(S) origin without credentials or a path.`;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value)
    ? value
    : `https://${value}`;
  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch (cause) {
    throw new Error(message, { cause });
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.pathname !== '/' ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0
  ) {
    throw new Error(message);
  }

  return parsed.toString();
}

export interface LandingEnv {
  siteUrl: string;
  productAppUrl: string;
  studioUrl: string;
  indexable: boolean;
  contentSource: 'fixtures' | 'sanity';
  sanityProjectId?: string;
  sanityDataset?: string;
  output: 'static' | 'preview';
  analytics: Readonly<{
    enabled: boolean;
    host: string;
    key?: string;
  }>;
  experimentsEnabled: boolean;
}

export function parseLandingEnv(
  env: Partial<
    Pick<
      NodeJS.ProcessEnv,
      | 'LANDING_CONTENT_SOURCE'
      | 'LANDING_INDEXING_ENABLED'
      | 'LANDING_ANALYTICS_ENABLED'
      | 'LANDING_EXPERIMENTS_ENABLED'
      | 'LANDING_POSTHOG_HOST'
      | 'LANDING_POSTHOG_KEY'
      | 'LANDING_OUTPUT'
      | 'MEMBER_APP_URL'
      | 'LANDING_SITE_URL'
      | 'SANITY_DATASET'
      | 'SANITY_PROJECT_ID'
      | 'SANITY_STUDIO_URL'
      | 'VERCEL_ENV'
      | 'VERCEL_PROJECT_PRODUCTION_URL'
      | 'VERCEL_URL'
    >
  >,
): LandingEnv {
  const analyticsFlag = env.LANDING_ANALYTICS_ENABLED ?? 'false';
  if (analyticsFlag !== 'true' && analyticsFlag !== 'false') {
    throw new Error('LANDING_ANALYTICS_ENABLED must be true or false.');
  }
  const analyticsEnabled = analyticsFlag === 'true';
  const experimentsFlag = env.LANDING_EXPERIMENTS_ENABLED ?? 'false';
  if (experimentsFlag !== 'true' && experimentsFlag !== 'false') {
    throw new Error('LANDING_EXPERIMENTS_ENABLED must be true or false.');
  }
  const experimentsEnabled = experimentsFlag === 'true';
  if (experimentsEnabled && !analyticsEnabled) {
    throw new Error('Landing experiments require analytics to be enabled.');
  }
  const analyticsKey = env.LANDING_POSTHOG_KEY?.trim();
  if (analyticsEnabled && !analyticsKey) {
    throw new Error(
      'LANDING_POSTHOG_KEY is required when analytics is enabled.',
    );
  }
  const analyticsHost = parseOrigin(
    env.LANDING_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
    'LANDING_POSTHOG_HOST',
  );
  const output = env.LANDING_OUTPUT ?? 'static';
  if (output !== 'static' && output !== 'preview') {
    throw new Error('LANDING_OUTPUT must be static or preview.');
  }
  const contentSource = env.LANDING_CONTENT_SOURCE ?? 'fixtures';
  if (contentSource !== 'fixtures' && contentSource !== 'sanity') {
    throw new Error('LANDING_CONTENT_SOURCE must be fixtures or sanity.');
  }
  if (
    contentSource === 'sanity' &&
    (!env.SANITY_PROJECT_ID || !env.SANITY_DATASET)
  ) {
    throw new Error(
      'Sanity content source requires SANITY_PROJECT_ID and SANITY_DATASET.',
    );
  }
  const rawSiteUrl =
    env.LANDING_SITE_URL?.trim() ||
    (env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
      : env.VERCEL_URL
        ? `https://${env.VERCEL_URL.trim()}`
        : defaultSiteUrl);

  const siteUrl = parseOrigin(rawSiteUrl, 'LANDING_SITE_URL');
  const productAppUrl = parseOrigin(
    env.MEMBER_APP_URL?.trim() || defaultProductAppUrl,
    'MEMBER_APP_URL',
  );
  const studioUrl = parseOrigin(
    env.SANITY_STUDIO_URL?.trim() || 'http://localhost:3333',
    'SANITY_STUDIO_URL',
  );

  return {
    siteUrl,
    productAppUrl,
    studioUrl,
    indexable:
      output === 'static' &&
      env.VERCEL_ENV === 'production' &&
      env.LANDING_INDEXING_ENABLED === 'true',
    contentSource,
    output,
    analytics: {
      enabled: analyticsEnabled,
      host: analyticsHost,
      ...(analyticsKey ? { key: analyticsKey } : {}),
    },
    experimentsEnabled,
    ...(contentSource === 'sanity'
      ? {
          sanityProjectId: env.SANITY_PROJECT_ID,
          sanityDataset: env.SANITY_DATASET,
        }
      : {}),
  };
}
