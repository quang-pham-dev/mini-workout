import { assertTestDatabase } from './database-env.ts';
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
export const testUsers = {
  active: { email: 'active-user@example.test', password: 'VisualTest123!' },
  empty: { email: 'empty-user@example.test', password: 'VisualTest123!' },
  newUser: { email: 'new-user@example.test', password: 'VisualTest123!' },
} as const;

export const fixtureUserWhere = {
  email: { in: Object.values(testUsers).map(({ email }) => email) },
};

export function cleanupUserWhere(claimedEmails: readonly string[]) {
  return {
    email: {
      in: [...fixtureUserWhere.email.in, ...new Set(claimedEmails)],
    },
  };
}

export type ConfigureUserInput = {
  onboardingCompleted: boolean;
  experienceLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  interestSlugs?: string[];
  favoriteWorkoutSlugs?: string[];
  likeWorkoutSlugs?: string[];
};

function createPrisma(databaseUrl: string): DatabaseClient {
  const { PrismaClient } = requireFromWeb('@prisma/client') as {
    PrismaClient: new (options: { datasourceUrl: string }) => DatabaseClient;
  };
  return new PrismaClient({ datasourceUrl: databaseUrl });
}

export async function prepareDatabase(databaseUrl: string): Promise<void> {
  assertTestDatabase(databaseUrl);

  const prisma = createPrisma(databaseUrl);

  try {
    await prisma.user.deleteMany({
      where: fixtureUserWhere,
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupDatabase(
  databaseUrl: string,
  claimedEmails: readonly string[] = [],
): Promise<void> {
  assertTestDatabase(databaseUrl);
  const prisma = createPrisma(databaseUrl);

  try {
    await prisma.user.deleteMany({
      where: cleanupUserWhere(claimedEmails),
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function configureUser(
  databaseUrl: string,
  email: string,
  input: ConfigureUserInput,
): Promise<void> {
  assertTestDatabase(databaseUrl);
  const prisma = createPrisma(databaseUrl);

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
        experienceLevel: input.experienceLevel,
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
