const placeholderValues = new Set([
  '',
  'replace-me',
  'replace-with-four-comma-separated-keys',
  'tobemodified',
]);

const productionSecrets = [
  'ADMIN_JWT_SECRET',
  'API_TOKEN_SALT',
  'APP_KEYS',
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'TRANSFER_TOKEN_SALT',
  'STRAPI_PREVIEW_SECRET',
  'STRAPI_WEBHOOK_TOKEN',
] as const;

export class CmsConfigurationError extends Error {
  readonly code = 'CONFIG_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'CmsConfigurationError';
  }
}

function requireSecret(
  env: NodeJS.ProcessEnv,
  name: (typeof productionSecrets)[number],
) {
  const value = env[name]?.trim().toLowerCase() ?? '';
  if (placeholderValues.has(value)) {
    throw new CmsConfigurationError(
      `${name} must be configured for production.`,
    );
  }
}

export function validateCmsEnvironment(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV !== 'production') return;

  if (env.DATABASE_CLIENT !== 'postgres') {
    throw new CmsConfigurationError(
      'DATABASE_CLIENT must be postgres in production.',
    );
  }
  if (!env.DATABASE_URL?.trim() && !env.DATABASE_HOST?.trim()) {
    throw new CmsConfigurationError(
      'Production PostgreSQL requires DATABASE_URL or DATABASE_HOST.',
    );
  }
  for (const name of productionSecrets) requireSecret(env, name);

  for (const name of [
    'STRAPI_PREVIEW_SECRET',
    'STRAPI_WEBHOOK_TOKEN',
  ] as const) {
    if ((env[name]?.trim().length ?? 0) < 32) {
      throw new CmsConfigurationError(
        `${name} must contain at least 32 characters.`,
      );
    }
  }

  const appKeys = env.APP_KEYS?.split(',').map((value) => value.trim()) ?? [];
  if (appKeys.length < 4 || appKeys.some((value) => value.length < 32)) {
    throw new CmsConfigurationError(
      'APP_KEYS must contain at least four comma-separated keys of 32 characters.',
    );
  }

  let publicUrl: URL;
  try {
    publicUrl = new URL(env.PUBLIC_URL ?? '');
  } catch {
    throw new CmsConfigurationError('PUBLIC_URL must be a valid HTTPS origin.');
  }
  if (
    publicUrl.protocol !== 'https:' ||
    publicUrl.pathname !== '/' ||
    publicUrl.search ||
    publicUrl.hash ||
    publicUrl.username ||
    publicUrl.password
  ) {
    throw new CmsConfigurationError('PUBLIC_URL must be a valid HTTPS origin.');
  }

  let previewUrl: URL;
  try {
    previewUrl = new URL(env.LANDING_PREVIEW_URL ?? '');
  } catch {
    throw new CmsConfigurationError(
      'LANDING_PREVIEW_URL must be a valid HTTPS origin.',
    );
  }
  if (
    previewUrl.protocol !== 'https:' ||
    previewUrl.pathname !== '/' ||
    previewUrl.search ||
    previewUrl.hash ||
    previewUrl.username ||
    previewUrl.password
  ) {
    throw new CmsConfigurationError(
      'LANDING_PREVIEW_URL must be a valid HTTPS origin.',
    );
  }
}
