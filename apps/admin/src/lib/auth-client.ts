import { createAuthClient } from 'better-auth/react';

type AdminAuthClient = ReturnType<typeof createAuthClient>;

const globalForAdminAuth = globalThis as typeof globalThis & {
  miniWorkoutAdminAuthClient?: AdminAuthClient;
};

export const authClient =
  globalForAdminAuth.miniWorkoutAdminAuthClient ?? createAuthClient();

if (process.env.NODE_ENV !== 'production') {
  globalForAdminAuth.miniWorkoutAdminAuthClient = authClient;
}
