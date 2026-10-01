const placeholderValues = new Set([
  '',
  'replace-me',
  'replace-with-four-comma-separated-keys',
  'tobemodified',
  'local-only-publish-signing-secret-change-before-deploy-00000000',
]);

const productionSecrets = [
  'ADMIN_JWT_SECRET',
  'API_TOKEN_SALT',
  'APP_KEYS',
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'TRANSFER_TOKEN_SALT',
  'STRAPI_PREVIEW_SECRET',
  'STRAPI_WEBHOOK_SIGNING_SECRET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
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

function requireHttpsOrigin(env: NodeJS.ProcessEnv, name: string): void {
  let value: URL;
  try {
    value = new URL(env[name] ?? '');
  } catch {
    throw new CmsConfigurationError(`${name} must be a valid HTTPS origin.`);
  }
  if (
    value.protocol !== 'https:' ||
    value.pathname !== '/' ||
    value.search ||
    value.hash ||
    value.username ||
    value.password
  ) {
    throw new CmsConfigurationError(`${name} must be a valid HTTPS origin.`);
  }
}

export function validateCmsEnvironment(env: NodeJS.ProcessEnv): void {
  if (
    Boolean(env.LANDING_PUBLISH_WEBHOOK_URL?.trim()) !==
    Boolean(env.STRAPI_WEBHOOK_SIGNING_SECRET?.trim())
  ) {
    throw new CmsConfigurationError(
      'LANDING_PUBLISH_WEBHOOK_URL and STRAPI_WEBHOOK_SIGNING_SECRET must be configured together.',
    );
  }
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
  if (env.CMS_UPLOAD_PROVIDER !== 'r2') {
    throw new CmsConfigurationError(
      'CMS_UPLOAD_PROVIDER must be r2 in production.',
    );
  }
  if (!env.R2_BUCKET?.trim()) {
    throw new CmsConfigurationError(
      'R2_BUCKET must be configured for production.',
    );
  }
  for (const name of productionSecrets) requireSecret(env, name);

  for (const name of [
    'STRAPI_PREVIEW_SECRET',
    'STRAPI_WEBHOOK_SIGNING_SECRET',
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

  requireHttpsOrigin(env, 'PUBLIC_URL');
  requireHttpsOrigin(env, 'LANDING_PREVIEW_URL');
  let publishWebhookUrl: URL;
  try {
    publishWebhookUrl = new URL(env.LANDING_PUBLISH_WEBHOOK_URL ?? '');
  } catch {
    throw new CmsConfigurationError(
      'LANDING_PUBLISH_WEBHOOK_URL must be a valid HTTPS webhook URL.',
    );
  }
  if (
    publishWebhookUrl.protocol !== 'https:' ||
    publishWebhookUrl.pathname !== '/api/webhooks/strapi/publish' ||
    publishWebhookUrl.username ||
    publishWebhookUrl.password ||
    publishWebhookUrl.search ||
    publishWebhookUrl.hash
  ) {
    throw new CmsConfigurationError(
      'LANDING_PUBLISH_WEBHOOK_URL must be a valid HTTPS webhook URL.',
    );
  }
  requireHttpsOrigin(env, 'R2_ENDPOINT');
  requireHttpsOrigin(env, 'R2_PUBLIC_URL');
}
