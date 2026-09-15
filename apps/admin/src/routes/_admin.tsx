import { AdminShell } from '@/components/admin-shell';
import { getAdminAccessStatus } from '@/lib/auth-functions';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_admin')({
  beforeLoad: async ({ location }) => {
    const access = await getAdminAccessStatus();
    if (access.status === 'unauthenticated') {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
    if (access.status === 'forbidden') throw redirect({ to: '/unauthorized' });
    return { admin: access };
  },
  component: AdminShell,
});
