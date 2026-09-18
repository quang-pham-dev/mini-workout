import { baseAuthOptions } from './base';
import { type Auth, type BetterAuthOptions, betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';

export const authOptions = {
  ...baseAuthOptions,
  plugins: [nextCookies()],
} satisfies BetterAuthOptions;

const globalForAuth = globalThis as typeof globalThis & {
  miniWorkoutWebAuth?: Auth;
};

export const auth = (globalForAuth.miniWorkoutWebAuth ??
  betterAuth(authOptions)) as Auth;

if (process.env.NODE_ENV !== 'production') {
  globalForAuth.miniWorkoutWebAuth = auth;
}
