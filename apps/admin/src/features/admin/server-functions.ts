import { adminCursorSearchSchema } from './contracts';
import { loadAdminCoachesPage, loadAdminWorkoutsPage } from './load-page';
import { adminFunctionMiddleware } from '@/lib/auth-functions';
import { createServerFn } from '@tanstack/react-start';

export const getAdminWorkouts = createServerFn({ method: 'GET' })
  .middleware([adminFunctionMiddleware])
  .validator(adminCursorSearchSchema)
  .handler(async ({ context, data }) => {
    return loadAdminWorkoutsPage({
      userId: context.userId,
      cursor: data.cursor,
    });
  });

export const getAdminCoaches = createServerFn({ method: 'GET' })
  .middleware([adminFunctionMiddleware])
  .validator(adminCursorSearchSchema)
  .handler(async ({ context, data }) => {
    return loadAdminCoachesPage({
      userId: context.userId,
      cursor: data.cursor,
    });
  });
