import { prisma } from '@mini-workout/database';

export type AdminCoachRow = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  updatedAt: Date;
  _count: { workouts: number };
};

export function findAdminCoaches(input: {
  cursor?: string;
  take: number;
}): Promise<AdminCoachRow[]> {
  return prisma.coach.findMany({
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: input.take,
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      updatedAt: true,
      _count: { select: { workouts: true } },
    },
  });
}
