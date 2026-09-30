import type { RepositoryConfig } from './published-content-repository.js';

type ParityEnvironment = Readonly<
  Partial<
    Record<
      | 'LANDING_CONTENT_SOURCE'
      | 'SANITY_DATASET'
      | 'SANITY_PROJECT_ID'
      | 'STRAPI_API_READ_TOKEN'
      | 'STRAPI_API_URL',
      string | undefined
    >
  >
>;

export class ContentParityCommandError extends Error {
  constructor(readonly code: 'CONFIG_INVALID') {
    super('Content parity configuration is invalid');
    this.name = 'ContentParityCommandError';
  }
}

function required(value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) throw new ContentParityCommandError('CONFIG_INVALID');
  return normalized;
}

export function resolveContentParityRepositoryConfig(
  env: ParityEnvironment,
): RepositoryConfig {
  const contentSource = env.LANDING_CONTENT_SOURCE?.trim();
  if (contentSource === 'fixtures') return { contentSource };
  if (contentSource === 'sanity') {
    return {
      contentSource,
      sanityProjectId: required(env.SANITY_PROJECT_ID),
      sanityDataset: required(env.SANITY_DATASET),
    };
  }
  if (contentSource === 'strapi') {
    return {
      contentSource,
      strapiApiUrl: required(env.STRAPI_API_URL),
      strapiApiReadToken: required(env.STRAPI_API_READ_TOKEN),
    };
  }
  throw new ContentParityCommandError('CONFIG_INVALID');
}
