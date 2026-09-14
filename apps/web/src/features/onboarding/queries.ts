import { prisma } from '@/lib/db/prisma';
import 'server-only';

export async function getInterests() {
  return prisma.interest.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });
}
