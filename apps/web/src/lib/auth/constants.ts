/**
 * Session cookie name used by better-auth.
 * Must stay in sync with the `advanced.cookies.session_token.name`
 * value in `src/auth.ts`.
 *
 * Kept in a separate file so it can be imported by edge-compatible
 * code (proxy.ts) without pulling in Prisma or other Node-only deps.
 */
export const SESSION_COOKIE_NAME = 'mini-workout-session';
export const ONBOARDING_COOKIE_NAME = 'mini-workout-onboarding-status';

export const ONBOARDING_COOKIE_VALUES = {
  IN_PROGRESS: 'in_progress',
  REQUIRED_DONE: 'required_done',
  COMPLETED: 'completed',
} as const;
