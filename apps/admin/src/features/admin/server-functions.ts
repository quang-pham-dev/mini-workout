import { adminCursorSearchSchema } from './contracts';
import { loadAdminCoachesPage, loadAdminWorkoutsPage } from './load-page';
import { adminFunctionMiddleware } from '@/lib/auth-functions';
import { reportAdminServerFunctionError } from '@/lib/observability/server-function-error';
import { createServerFn } from '@tanstack/react-start';

export const getAdminWorkouts = createServerFn({ method: 'GET' })
  .middleware([adminFunctionMiddleware])
  .validator(adminCursorSearchSchema)
  .handler(async ({ context, data }) => {
    try {
      return await loadAdminWorkoutsPage({
        userId: context.userId,
        cursor: data.cursor,
      });
    } catch (error) {
      reportAdminServerFunctionError(error, 'admin.workouts.list');
      throw error;
    }
  });

export const getAdminCoaches = createServerFn({ method: 'GET' })
  .middleware([adminFunctionMiddleware])
  .validator(adminCursorSearchSchema)
  .handler(async ({ context, data }) => {
    try {
      return await loadAdminCoachesPage({
        userId: context.userId,
        cursor: data.cursor,
      });
    } catch (error) {
      reportAdminServerFunctionError(error, 'admin.coaches.list');
      throw error;
    }
  });
