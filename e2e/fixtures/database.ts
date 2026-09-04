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
const approvedHosts = new Set(['127.0.0.1', '::1', 'localhost']);
const approvedDatabaseNames = new Set([
  'e2e',
  'mini_workout_e2e',
  'mini_workout_test',
  'test',
]);

export function assertTestDatabase(databaseUrl: string): void {
  try {
    const url = new URL(databaseUrl);
    const databaseName = decodeURIComponent(url.pathname.slice(1));

    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !approvedHosts.has(url.hostname) ||
      !approvedDatabaseNames.has(databaseName)
    ) {
      throw new Error('not approved');
    }
  } catch {
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
    const interestSlugs = input.interestSlugs ?? [];
    const interests = input.interestSlugs
      ? await prisma.interest.findMany({
          where: { slug: { in: interestSlugs } },
          select: { id: true },
        })
      : [];
    if (interests.length !== new Set(interestSlugs).size) {
      throw new Error(`E2E setup references an unknown interest slug`);
    }

    const favoriteWorkoutSlugs = input.favoriteWorkoutSlugs ?? [];
    const likeWorkoutSlugs = input.likeWorkoutSlugs ?? [];
    const workoutSlugs = [
      ...new Set([...favoriteWorkoutSlugs, ...likeWorkoutSlugs]),
    ];
    const workouts = await prisma.workout.findMany({
      where: {
        slug: { in: workoutSlugs },
      },
      select: { id: true, slug: true },
    });
    if (workouts.length !== workoutSlugs.length) {
      throw new Error(`E2E setup references an unknown workout slug`);
    }
    const workoutIds = new Map(
      workouts.map((workout) => [workout.slug, workout.id]),
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: input.onboardingCompleted,
        interests: {
          deleteMany: {},
          create: interests.map(({ id }) => ({ interestId: id })),
        },
        favorites: {
          deleteMany: {},
          create: favoriteWorkoutSlugs.map((slug) => ({
            workoutId: workoutIds.get(slug)!,
          })),
        },
        likes: {
          deleteMany: {},
          create: likeWorkoutSlugs.map((slug) => ({
            workoutId: workoutIds.get(slug)!,
          })),
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
