import { baseAuthOptions } from './base';
import {
  AuthFeatureFlagConfigurationError,
  authFeatureFlagReader,
} from './feature-flags';
import { createEmailVerificationRequestHook } from './verification-policy';
import { type Auth, type BetterAuthOptions, betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';

function getRolloutIdentitySecret() {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new AuthFeatureFlagConfigurationError(
      'BETTER_AUTH_SECRET is required in production',
    );
  }
  return 'development-only-auth-rollout-secret';
}

export const authOptions: BetterAuthOptions = {
  ...baseAuthOptions,
  hooks: {
    before: createEmailVerificationRequestHook({
      reader: authFeatureFlagReader,
      identitySecret: getRolloutIdentitySecret(),
    }),
  },
  plugins: [nextCookies()],
};

const globalForAuth = globalThis as typeof globalThis & {
  miniWorkoutWebAuth?: Auth;
};

export const auth = (globalForAuth.miniWorkoutWebAuth ??
  betterAuth(authOptions)) as Auth;

if (process.env.NODE_ENV !== 'production') {
  globalForAuth.miniWorkoutWebAuth = auth;
}
