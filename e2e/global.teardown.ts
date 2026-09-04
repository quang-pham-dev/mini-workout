import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import {
  databaseRunKey,
  releaseDatabaseLock,
} from './fixtures/database-lock.ts';
import { cleanupDatabase } from './fixtures/database.ts';
import { parseFixtureMetadata } from './fixtures/metadata.ts';
import { withFixtureTeardown } from './fixtures/setup-lifecycle.ts';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
  try {
    await withFixtureTeardown(
      () => rmSync(authDirectory, { recursive: true, force: true }),
      () => cleanupDatabase(databaseUrl),
      () => releaseDatabaseLock(databaseUrl, token),
      () => rmSync(lockFile, { force: true }),
    );
  } catch (error) {
    cleanupError = error;
  }
  if (metadataError !== undefined) throw metadataError;
  if (cleanupError !== undefined) throw cleanupError;
}
