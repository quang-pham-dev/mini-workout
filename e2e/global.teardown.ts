import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import {
  databaseRunKey,
  isDatabaseLockOwner,
  releaseDatabaseLock,
} from './fixtures/database-lock.ts';
import { cleanupDatabase } from './fixtures/database.ts';
import { parseFixtureMetadata } from './fixtures/metadata.ts';
import { withFixtureTeardown } from './fixtures/setup-lifecycle.ts';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function cleanupDatabaseIfOwned(
  databaseUrl: string,
  token: string | undefined,
  cleanup: () => void | Promise<void>,
  lockDirectory?: string,
): Promise<void> {
  if (
    token === undefined ||
    !isDatabaseLockOwner(databaseUrl, token, lockDirectory)
  ) {
    return;
  }
  await cleanup();
}

export default async function globalTeardown() {
  if (!process.env.E2E_DATABASE_URL || !process.env.DATABASE_URL) return;
  const databaseUrl = resolveDatabaseUrl(process.env);
  const key = databaseRunKey(databaseUrl);
  const authDirectory = fileURLToPath(
    new URL(`./.auth/${key}`, import.meta.url),
  );
  const lockFile = fileURLToPath(
    new URL(`./.auth/${key}.json`, import.meta.url),
  );
  let token: string | undefined;
  let metadataError: unknown;
  if (existsSync(lockFile)) {
    try {
      token = parseFixtureMetadata(
        JSON.parse(readFileSync(lockFile, 'utf8')),
        key,
      ).token;
    } catch (error) {
      metadataError = error;
    }
  }

  let cleanupError: unknown;
  const ownsLock =
    token !== undefined && isDatabaseLockOwner(databaseUrl, token);
  try {
    await withFixtureTeardown(
      () => rmSync(authDirectory, { recursive: true, force: true }),
      () =>
        ownsLock
          ? cleanupDatabaseIfOwned(databaseUrl, token, () =>
              cleanupDatabase(databaseUrl),
            )
          : undefined,
      () => (ownsLock ? releaseDatabaseLock(databaseUrl, token) : undefined),
      () => rmSync(lockFile, { force: true }),
    );
  } catch (error) {
    cleanupError = error;
  }
  if (metadataError !== undefined) throw metadataError;
  if (cleanupError !== undefined) throw cleanupError;
}
