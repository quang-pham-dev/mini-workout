const defaultSiteUrl = 'https://example.com/';
const invalidSiteUrlMessage =
  'LANDING_SITE_URL must be an HTTP(S) origin without credentials or a path.';

export interface LandingEnv {
  siteUrl: string;
  indexable: boolean;
  contentSource: 'fixtures' | 'sanity';
  sanityProjectId?: string;
  sanityDataset?: string;
  output: 'static' | 'preview';
}

export function parseLandingEnv(
  env: Partial<
    Pick<
      NodeJS.ProcessEnv,
      | 'LANDING_CONTENT_SOURCE'
      | 'LANDING_INDEXING_ENABLED'
      | 'LANDING_OUTPUT'
      | 'LANDING_SITE_URL'
      | 'SANITY_DATASET'
      | 'SANITY_PROJECT_ID'
      | 'VERCEL_ENV'
    >
  >,
): LandingEnv {
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
      output === 'static' &&
      env.VERCEL_ENV === 'production' &&
      env.LANDING_INDEXING_ENABLED === 'true',
    contentSource,
    output,
    ...(contentSource === 'sanity'
      ? {
          sanityProjectId: env.SANITY_PROJECT_ID,
          sanityDataset: env.SANITY_DATASET,
        }
      : {}),
  };
}
