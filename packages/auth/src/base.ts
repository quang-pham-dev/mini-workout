import { SESSION_COOKIE_NAME } from './constants';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '@mini-workout/database';
import type { BetterAuthOptions } from 'better-auth';

function getTrustedOrigins(): string[] | undefined {
  const origins = new Set<string>();

  if (process.env.BETTER_AUTH_URL) {
    origins.add(process.env.BETTER_AUTH_URL);
  }

  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    for (const origin of process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://localhost:3001');
    origins.add('http://localhost:3102');
    origins.add('http://127.0.0.1:3000');
    origins.add('http://127.0.0.1:3001');
    origins.add('http://127.0.0.1:3102');
  }

  return origins.size > 0 ? Array.from(origins) : undefined;
}

export function getE2ERateLimitOverride(
  env: NodeJS.ProcessEnv,
): Pick<BetterAuthOptions, 'rateLimit'> {
  return env.E2E_AUTH_RATE_LIMIT_DISABLED === '1'
    ? { rateLimit: { enabled: false } }
    : {};
}

export const baseAuthOptions = {
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: getTrustedOrigins(),
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  ...getE2ERateLimitOverride(process.env),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'MEMBER',
        input: false,
      },
    },
  },
  advanced: {
    cookies: {
      session_token: {
        name: SESSION_COOKIE_NAME,
        attributes: {
          sameSite: 'lax',
          httpOnly: true,
          secure: true,
        },
      },
    },
  },
} satisfies BetterAuthOptions;
