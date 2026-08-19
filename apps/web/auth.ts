import { prisma } from './lib/db/prisma';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { type Auth, type BetterAuthOptions, betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';

const authOptions: BetterAuthOptions = {
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      onboardingCompleted: {
        type: 'boolean',
        defaultValue: false,
        input: false,
        required: false,
      },
    },
  },
  plugins: [nextCookies()],
};

export const auth: Auth = betterAuth(authOptions);
