import {
  type AuthRateLimitRule,
  type AuthRateLimitStore,
  createAuthActionRateLimiter,
  getAuthRateLimitOptions,
} from './rate-limit';
import { Prisma, prisma } from '@mini-workout/database';
import { randomUUID } from 'node:crypto';

type RateLimitPrismaClient = Readonly<{
  $executeRaw: (query: Prisma.Sql) => Promise<number>;
  $queryRaw: <T>(query: Prisma.Sql) => Promise<T>;
}>;

const PRUNE_INTERVAL_MS = 5 * 60 * 1_000;
const RETENTION_MS = 24 * 60 * 60 * 1_000;

export function createPrismaAuthRateLimitStore(
  client: RateLimitPrismaClient,
): AuthRateLimitStore {
  let nextPruneAt = 0;

  return {
    async consume(key: string, rule: AuthRateLimitRule) {
      const now = Date.now();
      if (now >= nextPruneAt) {
        nextPruneAt = now + PRUNE_INTERVAL_MS;
        await client.$executeRaw(
          Prisma.sql`DELETE FROM "rateLimit" WHERE "lastRequest" < ${BigInt(
            now - RETENTION_MS,
          )}`,
        );
      }

      const rows = await client.$queryRaw<Array<{ count: number }>>(
        Prisma.sql`
          INSERT INTO "rateLimit" ("id", "key", "count", "lastRequest")
          VALUES (${randomUUID()}, ${key}, 1, ${BigInt(now)})
          ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE
              WHEN ${BigInt(now)} - "rateLimit"."lastRequest" >= ${BigInt(
                rule.window * 1_000,
              )} THEN 1
              ELSE "rateLimit"."count" + 1
            END,
            "lastRequest" = ${BigInt(now)}
          WHERE
            ${BigInt(now)} - "rateLimit"."lastRequest" >= ${BigInt(
              rule.window * 1_000,
            )}
            OR "rateLimit"."count" < ${rule.max}
          RETURNING "count"
        `,
      );

      return rows.length > 0
        ? { allowed: true, retryAfter: null }
        : { allowed: false, retryAfter: rule.window };
    },
  };
}

const rateLimitOptions = getAuthRateLimitOptions(process.env);
export const prismaAuthRateLimitStore = createPrismaAuthRateLimitStore(prisma);

export const authActionRateLimiter = createAuthActionRateLimiter({
  enabled: rateLimitOptions.enabled === true,
  identitySecret: process.env.BETTER_AUTH_SECRET ?? '',
  store: prismaAuthRateLimitStore,
});
