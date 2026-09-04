import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type LockOwner = { pid: number; token: string };
export type DatabaseLock = { release: () => void; token: string };

function lockPath(databaseUrl: string, directory: string): string {
  const digest = createHash('sha256').update(databaseUrl).digest('hex');
  return join(directory, `${digest}.lock`);
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireDatabaseLock(
  databaseUrl: string,
  directory = join(tmpdir(), 'mini-workout-e2e-locks'),
): DatabaseLock {
  mkdirSync(directory, { recursive: true });
  const path = lockPath(databaseUrl, directory);
  const owner: LockOwner = { pid: process.pid, token: randomUUID() };
  let acquired = false;

  try {
    mkdirSync(path);
    acquired = true;
    writeFileSync(join(path, 'owner.json'), JSON.stringify(owner), 'utf8');
  } catch (error) {
    if (acquired) rmSync(path, { recursive: true, force: true });
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    try {
      const existing = JSON.parse(
        readFileSync(join(path, 'owner.json'), 'utf8'),
      ) as LockOwner;
      if (isProcessAlive(existing.pid)) {
        throw new Error('E2E database fixture run is already in use');
      }
      rmSync(path, { recursive: true, force: true });
      return acquireDatabaseLock(databaseUrl, directory);
    } catch (readError) {
      if (
        readError instanceof Error &&
        /already in use/.test(readError.message)
      ) {
        throw readError;
      }
      throw new Error('E2E database fixture run is already in use', {
        cause: readError,
      });
    }
  }

  return {
    token: owner.token,
    release: () => {
      try {
        const current = JSON.parse(
          readFileSync(join(path, 'owner.json'), 'utf8'),
        ) as LockOwner;
        if (current.token === owner.token)
          rmSync(path, { recursive: true, force: true });
      } catch {
        // The lock is already gone or belongs to another run.
      }
    },
  };
}

export function releaseDatabaseLock(
  databaseUrl: string,
  token: string,
  directory = join(tmpdir(), 'mini-workout-e2e-locks'),
): void {
  const path = lockPath(databaseUrl, directory);
  try {
    const owner = JSON.parse(
      readFileSync(join(path, 'owner.json'), 'utf8'),
    ) as LockOwner;
    if (owner.token === token) rmSync(path, { recursive: true, force: true });
  } catch {
    // Setup may have failed before a lock was created.
  }
}
