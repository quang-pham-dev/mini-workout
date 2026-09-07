import { isDatabaseLockOwner } from './fixtures/database-lock.ts';

export async function cleanupDatabaseIfOwned(
  databaseUrl: string,
  token: string | undefined,
  cleanup: () => void | Promise<void>,
  lockDirectory?: string,
): Promise<void> {
  if (
    token === undefined ||
    !isDatabaseLockOwner(databaseUrl, token, lockDirectory)
  )
    return;
  await cleanup();
}
