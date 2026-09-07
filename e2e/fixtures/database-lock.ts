import { assertTestDatabase } from './database-env.ts';
import { createHash, randomUUID } from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type DatabaseLock = { release: () => void; token: string };
const defaultDirectory = join(tmpdir(), 'mini-workout-e2e-locks');

export function assertSafeLockToken(token: unknown): asserts token is string {
  if (
    typeof token !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token,
    )
  ) {
    throw new Error('E2E database fixture lock token is malformed');
  }
}

function readLockOwner(path: string): { pid: number; token: string } {
  if (!lstatSync(path).isDirectory())
    throw new Error('E2E lock owner directory is malformed');
  const entries = readdirSync(path);
  const token = entries[0];
  assertSafeLockToken(token);
  const ownerPath = join(path, token, 'owner');
  if (
    entries.length !== 1 ||
    !lstatSync(join(path, token)).isDirectory() ||
    !lstatSync(ownerPath).isFile()
  ) {
    throw new Error('E2E lock owner is malformed');
  }
  const owner = JSON.parse(readFileSync(ownerPath, 'utf8'));
  if (
    !owner ||
    Object.keys(owner).length !== 2 ||
    !Number.isSafeInteger(owner.pid) ||
    owner.pid <= 0 ||
    owner.token !== token
  ) {
    throw new Error('E2E lock owner is malformed');
  }
  return owner;
}

export function databaseRunKey(databaseUrl: string): string {
  assertTestDatabase(databaseUrl);
  const url = new URL(databaseUrl);
  // All permitted loopback hosts may address the same server. Over-lock safely.
  const resource = `postgresql://local:${url.port || '5432'}/${decodeURIComponent(url.pathname.slice(1))}`;
  return createHash('sha256').update(resource).digest('hex');
}

export function lockPathForDatabase(
  databaseUrl: string,
  directory: string,
): string {
  return join(directory, `${databaseRunKey(databaseUrl)}.lock`);
}

export function isDatabaseLockOwner(
  databaseUrl: string,
  token: string,
  directory = defaultDirectory,
): boolean {
  assertSafeLockToken(token);
  try {
    return (
      readLockOwner(lockPathForDatabase(databaseUrl, directory)).token === token
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export function acquireDatabaseLock(
  databaseUrl: string,
  directory = defaultDirectory,
): DatabaseLock {
  const path = lockPathForDatabase(databaseUrl, directory);
  mkdirSync(directory, { recursive: true });
  try {
    mkdirSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    throw new Error(
      `E2E database fixture run is already in use. Manual recovery required: stop all fixture coordinators and workers, verify no consumers remain, then remove ${path} and this resource's auth artifacts before retrying. Never recover while a run is active.`,
    );
  }
  const token = randomUUID();
  // Incomplete publication is deliberately retained for manual recovery.
  mkdirSync(join(path, token));
  writeFileSync(
    join(path, token, 'owner'),
    JSON.stringify({ pid: process.pid, token }),
  );
  return {
    token,
    release: () => releaseDatabaseLock(databaseUrl, token, directory),
  };
}

export function releaseDatabaseLock(
  databaseUrl: string,
  token: string | undefined,
  directory = defaultDirectory,
): void {
  if (token === undefined) return;
  if (!isDatabaseLockOwner(databaseUrl, token, directory)) return;
  const path = lockPathForDatabase(databaseUrl, directory);
  rmSync(join(path, token), { recursive: true });
  rmdirSync(path);
}
