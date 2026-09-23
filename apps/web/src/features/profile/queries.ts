import { getLoginRedirectPath } from '@/lib/auth/authorization';
import { getCurrentSession } from '@/lib/auth/session';
import { NotFoundError } from '@mini-workout/core/errors';
import { getMemberProfile } from '@mini-workout/core/users';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function getUserProfile() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect(getLoginRedirectPath((await headers()).get('x-pathname')));
  }

  try {
    return await getMemberProfile({ userId: session.user.id });
  } catch (error) {
    if (error instanceof NotFoundError) {
      redirect(getLoginRedirectPath((await headers()).get('x-pathname')));
    }
    throw error;
  }
}
