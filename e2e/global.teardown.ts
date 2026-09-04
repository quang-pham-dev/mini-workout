import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import {
  databaseRunKey,
  releaseDatabaseLock,
} from './fixtures/database-lock.ts';
import { cleanupDatabase } from './fixtures/database.ts';
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
      const metadata = JSON.parse(readFileSync(lockFile, 'utf8')) as {
        key: string;
        token: string;
      };
      if (metadata.key !== key)
        throw new Error('E2E metadata does not match this run');
      token = metadata.token;
    } catch (error) {
      metadataError = error;
    }
  }

  let cleanupError: unknown;
  try {
    await withFixtureTeardown(
      async () => {
        try {
          if (token) await cleanupDatabase(databaseUrl);
        } finally {
          rmSync(authDirectory, { recursive: true, force: true });
        }
      },
      () => rmSync(lockFile, { force: true }),
      () => {
        if (token) releaseDatabaseLock(databaseUrl, token);
      },
    );
  } catch (error) {
    cleanupError = error;
  }
  if (metadataError !== undefined) throw metadataError;
  if (cleanupError !== undefined) throw cleanupError;
}
