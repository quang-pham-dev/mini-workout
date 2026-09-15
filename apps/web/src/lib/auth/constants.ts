/**
 * Session cookie name used by better-auth.
 * Re-exported from the shared auth package, which owns the cookie config.
 *
 * Kept in a separate file so it can be imported by edge-compatible
 * code (proxy.ts) without pulling in Prisma or other Node-only deps.
 */
export { SESSION_COOKIE_NAME } from '@mini-workout/auth/constants';
export const ONBOARDING_COOKIE_NAME = 'mini-workout-onboarding-status';

export const ONBOARDING_COOKIE_VALUES = {
  IN_PROGRESS: 'in_progress',
  REQUIRED_DONE: 'required_done',
  COMPLETED: 'completed',
} as const;
