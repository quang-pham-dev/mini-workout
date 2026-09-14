import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import { prisma } from '@/lib/db/prisma';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { type Auth, type BetterAuthOptions, betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';

const authOptions: BetterAuthOptions = {
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : undefined,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
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
  plugins: [nextCookies()],
};

export const auth: Auth = betterAuth(authOptions);
