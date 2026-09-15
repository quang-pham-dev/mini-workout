import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & {
  miniWorkoutPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.miniWorkoutPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.miniWorkoutPrisma = prisma;
}
