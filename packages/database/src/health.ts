import { prisma } from './prisma';

export async function pingDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
