import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import {
  databaseRunKey,
  releaseDatabaseLock,
} from './fixtures/database-lock.ts';
import { cleanupDatabase } from './fixtures/database.ts';
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
  let cleanupSucceeded = false;
  try {
    if (existsSync(lockFile)) {
      const { databaseUrl: metadataUrl, token } = JSON.parse(
        readFileSync(lockFile, 'utf8'),
      ) as {
        databaseUrl: string;
        token: string;
      };
      try {
        if (metadataUrl !== databaseUrl)
          throw new Error('E2E metadata does not match this run');
        await cleanupDatabase(databaseUrl);
        cleanupSucceeded = true;
      } finally {
        releaseDatabaseLock(databaseUrl, token);
      }
    }
  } finally {
    rmSync(authDirectory, { recursive: true, force: true });
    if (cleanupSucceeded) rmSync(lockFile, { force: true });
  }
}
