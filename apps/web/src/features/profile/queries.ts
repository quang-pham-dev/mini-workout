import { getCurrentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export async function getUserProfile() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      interests: {
        include: {
          interest: true,
        },
      },
      _count: {
        select: {
          likes: true,
          favorites: true,
        },
      },
    },
  });
}
