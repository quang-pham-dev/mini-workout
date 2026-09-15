import { prisma } from '@mini-workout/database';

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthenticationRequiredError';
  }
}

export class AdminRequiredError extends Error {
  constructor() {
    super('Admin role required');
    this.name = 'AdminRequiredError';
  }
}

export function isAdmin(
  user: { role?: string | null } | null | undefined,
): boolean {
  return user?.role === 'ADMIN';
}

/** Always check the current database role; session claims can be stale after revocation. */
export async function requireAdmin(
  session:
    { user?: { id?: string | null; role?: string | null } } | null | undefined,
): Promise<{ userId: string }> {
  const userId = session?.user?.id;
  if (!userId) throw new AuthenticationRequiredError();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!isAdmin(user)) throw new AdminRequiredError();
  return { userId };
}
