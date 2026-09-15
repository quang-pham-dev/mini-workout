import { baseAuthOptions } from './base';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';

export const authOptions = {
  ...baseAuthOptions,
  plugins: [nextCookies()],
} satisfies BetterAuthOptions;

export const auth = betterAuth(authOptions);
