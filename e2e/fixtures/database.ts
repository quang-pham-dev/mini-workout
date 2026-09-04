import { createRequire } from 'node:module';

const requireFromWeb = createRequire(
  new URL('../../apps/web/package.json', import.meta.url),
);
type DatabaseClient = {
  user: {
    deleteMany(args: unknown): Promise<unknown>;
    findUniqueOrThrow(args: unknown): Promise<{ id: string }>;
    update(args: unknown): Promise<unknown>;
  };
  interest: {
    findMany(args: unknown): Promise<Array<{ id: string }>>;
  };
  workout: {
    findMany(args: unknown): Promise<Array<{ id: string; slug: string }>>;
  };
  $disconnect(): Promise<void>;
};
const { PrismaClient } = requireFromWeb('@prisma/client') as {
  PrismaClient: new (options: { datasourceUrl: string }) => DatabaseClient;
};

export const testUsers = {
  active: { email: 'active-user@example.test', password: 'VisualTest123!' },
  empty: { email: 'empty-user@example.test', password: 'VisualTest123!' },
  newUser: { email: 'new-user@example.test', password: 'VisualTest123!' },
  long: { email: 'long-user@example.test', password: 'VisualTest123!' },
} as const;

const testEmailDomain = '@example.test';

export function assertTestDatabase(databaseUrl: string): void {
  let databaseName: string;

  try {
    databaseName = new URL(databaseUrl).pathname.toLowerCase();
  } catch {
    throw new Error('E2E setup requires a disposable test database');
  }

  if (!databaseName.includes('test') && !databaseName.includes('e2e')) {
    throw new Error('E2E setup requires a disposable test database');
  }
}

export async function prepareDatabase(databaseUrl: string): Promise<void> {
  assertTestDatabase(databaseUrl);

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

  try {
    await prisma.user.deleteMany({
      where: { email: { endsWith: testEmailDomain } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function configureUser(
  databaseUrl: string,
  email: string,
  input: {
    onboardingCompleted: boolean;
    interestSlugs?: string[];
    favoriteWorkoutSlugs?: string[];
    likeWorkoutSlugs?: string[];
  },
): Promise<void> {
  assertTestDatabase(databaseUrl);
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const interests = input.interestSlugs
      ? await prisma.interest.findMany({
          where: { slug: { in: input.interestSlugs } },
          select: { id: true },
        })
      : [];
    const workouts = await prisma.workout.findMany({
      where: {
        slug: {
          in: [
            ...(input.favoriteWorkoutSlugs ?? []),
            ...(input.likeWorkoutSlugs ?? []),
          ],
        },
      },
      select: { id: true, slug: true },
    });
    const workoutIds = new Map(
      workouts.map((workout) => [workout.slug, workout.id]),
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: input.onboardingCompleted,
        interests: {
          create: interests.map(({ id }) => ({ interestId: id })),
        },
        favorites: {
          create: (input.favoriteWorkoutSlugs ?? []).map((slug) => ({
            workoutId: workoutIds.get(slug)!,
          })),
        },
        likes: {
          create: (input.likeWorkoutSlugs ?? []).map((slug) => ({
            workoutId: workoutIds.get(slug)!,
          })),
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
