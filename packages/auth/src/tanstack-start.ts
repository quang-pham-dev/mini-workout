import { baseAuthOptions } from './base';
import { type Auth, type BetterAuthOptions, betterAuth } from 'better-auth';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

export const tanstackAuthOptions = {
  ...baseAuthOptions,
  plugins: [tanstackStartCookies()],
} satisfies BetterAuthOptions;

const globalForAuth = globalThis as typeof globalThis & {
  miniWorkoutTanStackAuth?: Auth;
};

export const tanstackAuth = (globalForAuth.miniWorkoutTanStackAuth ??
  betterAuth(tanstackAuthOptions)) as Auth;

if (process.env.NODE_ENV !== 'production') {
  globalForAuth.miniWorkoutTanStackAuth = tanstackAuth;
}
