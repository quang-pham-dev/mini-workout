import {
  AdminRequiredError,
  AuthenticationRequiredError,
  requireAdmin,
} from '@mini-workout/auth/authorization';

export type AdminSession = {
  user: { id: string; email: string; name: string };
};

export type AdminAccessStatus =
  | { status: 'authenticated'; userId: string; email: string; name: string }
  | { status: 'forbidden' }
  | { status: 'unauthenticated' };

type AuthorizeAdmin = (session: AdminSession) => Promise<{ userId: string }>;

export async function classifyAdminAccess(
  session: AdminSession | null | undefined,
  authorize: AuthorizeAdmin = requireAdmin,
): Promise<AdminAccessStatus> {
  if (!session?.user.id) return { status: 'unauthenticated' };

  try {
    const { userId } = await authorize(session);
    return {
      status: 'authenticated',
      userId,
      email: session.user.email,
      name: session.user.name,
    };
  } catch (error) {
    if (error instanceof AdminRequiredError) return { status: 'forbidden' };
    throw error;
  }
}

export async function requireAdminActor(
  session: AdminSession | null | undefined,
  authorize: AuthorizeAdmin = requireAdmin,
): Promise<{ userId: string }> {
  if (!session?.user.id) throw new AuthenticationRequiredError();
  return authorize(session);
}
