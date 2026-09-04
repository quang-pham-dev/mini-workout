import { cleanupDatabase } from './fixtures/database';
import { resolveDatabaseUrl } from './fixtures/database-env';
import { releaseDatabaseLock } from './fixtures/database-lock';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default async function globalTeardown() {
  const authDirectory = fileURLToPath(new URL('./.auth', import.meta.url));
  const lockFile = fileURLToPath(
    new URL('./.auth/database-lock.json', import.meta.url),
  );
  try {
    if (existsSync(lockFile)) {
      const { databaseUrl, token } = JSON.parse(
        readFileSync(lockFile, 'utf8'),
      ) as {
        databaseUrl: string;
        token: string;
      };
      try {
        await cleanupDatabase(
          resolveDatabaseUrl({
            E2E_DATABASE_URL: databaseUrl,
            DATABASE_URL: databaseUrl,
          }),
        );
      } finally {
        releaseDatabaseLock(databaseUrl, token);
      }
    }
  } finally {
    rmSync(authDirectory, { recursive: true, force: true });
  }
}
