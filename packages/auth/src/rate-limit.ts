import type { BetterAuthRateLimitOptions } from 'better-auth';
import { createHmac } from 'node:crypto';

export const AUTH_RATE_LIMIT_RULES = {
  '/sign-in/email': { window: 60, max: 5 },
  '/sign-up/email': { window: 60, max: 3 },
  '/send-verification-email': { window: 300, max: 3 },
  '/request-password-reset': { window: 300, max: 3 },
  '/reset-password': { window: 300, max: 5 },
  '/verify-email': { window: 300, max: 10 },
} satisfies NonNullable<BetterAuthRateLimitOptions['customRules']>;

export type AuthRateLimitRule = Readonly<{ window: number; max: number }>;

export type AuthRateLimitStore = Readonly<{
  consume: (
    key: string,
    rule: AuthRateLimitRule,
  ) => Promise<Readonly<{ allowed: boolean; retryAfter: number | null }>>;
}>;

export class AuthRateLimitedError extends Error {
  readonly code = 'AUTH_RATE_LIMITED';
  readonly category = 'rate_limited';
  readonly status = 429;
  readonly retryable = true;
  readonly reportable = false;

  constructor(readonly retryAfter: number) {
    super('Too many requests. Please try again later.');
    this.name = 'AuthRateLimitedError';
  }
}

export class AuthRateLimitUnavailableError extends Error {
  readonly code = 'DEPENDENCY_UNAVAILABLE';
  readonly category = 'dependency';
  readonly status = 503;
  readonly retryable = true;
  readonly reportable = true;

  constructor(cause?: unknown) {
    super('Authentication protection is temporarily unavailable.', { cause });
    this.name = 'AuthRateLimitUnavailableError';
  }
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

function isMatchingDisposableDatabase(env: NodeJS.ProcessEnv): boolean {
  const databaseUrl = env.DATABASE_URL;
  const e2eDatabaseUrl = env.E2E_DATABASE_URL;
  if (!databaseUrl || databaseUrl !== e2eDatabaseUrl) return false;

  try {
    const url = new URL(databaseUrl);
    const databaseName = decodeURIComponent(
      url.pathname.slice(1),
    ).toLowerCase();
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      LOOPBACK_HOSTS.has(url.hostname.toLowerCase()) &&
      databaseName.includes('e2e')
    );
  } catch {
    return false;
  }
}

export function getAuthRateLimitOptions(
  env: NodeJS.ProcessEnv,
  durableStore?: AuthRateLimitStore,
): BetterAuthRateLimitOptions {
  if (
    env.E2E_AUTH_RATE_LIMIT_DISABLED === '1' &&
    isMatchingDisposableDatabase(env)
  ) {
    return { enabled: false };
  }

  const isProduction = env.NODE_ENV === 'production';
  const options: BetterAuthRateLimitOptions = {
    enabled: isProduction,
    storage: isProduction ? 'database' : 'memory',
    window: 60,
    max: 100,
    customRules: AUTH_RATE_LIMIT_RULES,
  };

  if (isProduction && durableStore) {
    options.customStorage = createPseudonymousAuthRateLimitStore({
      identitySecret: env.BETTER_AUTH_SECRET ?? '',
      namespace: 'auth-http',
      store: durableStore,
    });
  }

  return options;
}

function getClientAddress(headers: Headers): string {
  for (const name of [
    'x-vercel-forwarded-for',
    'cf-connecting-ip',
    'x-forwarded-for',
    'x-real-ip',
  ]) {
    const value = headers.get(name)?.split(',')[0]?.trim();
    if (value) return value;
  }
  return 'unavailable';
}

function pseudonymousBucket(value: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(value.trim().toLowerCase())
    .digest('hex');
}

export function createPseudonymousAuthRateLimitStore({
  identitySecret,
  namespace,
  store,
}: Readonly<{
  identitySecret: string;
  namespace: string;
  store: AuthRateLimitStore;
}>): AuthRateLimitStore {
  return {
    async consume(key, rule) {
      if (!identitySecret) throw new AuthRateLimitUnavailableError();

      try {
        return await store.consume(
          `${namespace}:${pseudonymousBucket(key, identitySecret)}`,
          rule,
        );
      } catch (error) {
        if (error instanceof AuthRateLimitUnavailableError) throw error;
        throw new AuthRateLimitUnavailableError(error);
      }
    },
  };
}

export function createAuthActionRateLimiter({
  enabled,
  identitySecret,
  store,
}: Readonly<{
  enabled: boolean;
  identitySecret: string;
  store: AuthRateLimitStore;
}>) {
  return {
    async check({
      path,
      identifier,
      headers,
    }: Readonly<{
      path: keyof typeof AUTH_RATE_LIMIT_RULES;
      identifier?: string;
      headers: Headers;
    }>): Promise<void> {
      if (!enabled) return;
      if (!identitySecret) throw new AuthRateLimitUnavailableError();

      const rule = AUTH_RATE_LIMIT_RULES[path];
      const buckets = [
        `auth-action:${path}:ip:${pseudonymousBucket(
          getClientAddress(headers),
          identitySecret,
        )}`,
      ];
      if (identifier?.trim()) {
        buckets.push(
          `auth-action:${path}:identity:${pseudonymousBucket(
            identifier,
            identitySecret,
          )}`,
        );
      }

      try {
        for (const key of buckets) {
          const decision = await store.consume(key, rule);
          if (!decision.allowed) {
            throw new AuthRateLimitedError(decision.retryAfter ?? rule.window);
          }
        }
      } catch (error) {
        if (error instanceof AuthRateLimitedError) throw error;
        if (error instanceof AuthRateLimitUnavailableError) throw error;
        throw new AuthRateLimitUnavailableError(error);
      }
    },
  };
}
