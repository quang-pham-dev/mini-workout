import { baseAuthOptions } from './base';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

export const tanstackAuthOptions = {
  ...baseAuthOptions,
  plugins: [tanstackStartCookies()],
} satisfies BetterAuthOptions;

export const tanstackAuth = betterAuth(tanstackAuthOptions);
