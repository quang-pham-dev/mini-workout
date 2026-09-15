import {
  type AdminAccessStatus,
  type AdminSession,
  classifyAdminAccess,
  requireAdminActor,
} from './auth-policy';
import { tanstackAuth } from '@mini-workout/auth/tanstack-start';
import { createMiddleware, createServerFn } from '@tanstack/react-start';
import {
  getRequestHeaders,
  setResponseHeader,
} from '@tanstack/react-start/server';

async function readSession() {
  return tanstackAuth.api.getSession({
    headers: getRequestHeaders(),
  }) as Promise<AdminSession | null>;
}

function markPrivateResponse() {
  setResponseHeader('Cache-Control', 'private, no-store');
  setResponseHeader('Vary', 'Cookie');
}

export const getAdminAccessStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminAccessStatus> => {
    markPrivateResponse();
    return classifyAdminAccess(await readSession());
  },
);

export const adminFunctionMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  markPrivateResponse();
  const { userId } = await requireAdminActor(await readSession());
  return next({ context: { userId } });
});
