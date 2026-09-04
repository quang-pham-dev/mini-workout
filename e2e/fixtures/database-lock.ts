import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type LockOwner = { pid: number; token: string };
export type DatabaseLock = { release: () => void; token: string };

function parseLockOwner(value: unknown): LockOwner {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2
  ) {
    throw new Error('E2E database fixture lock owner is malformed');
  }

  const owner = value as Record<string, unknown>;
  if (
    !Object.hasOwn(owner, 'pid') ||
    !Object.hasOwn(owner, 'token') ||
    !Number.isSafeInteger(owner.pid) ||
    (owner.pid as number) <= 0 ||
    typeof owner.token !== 'string' ||
    owner.token.trim() === ''
  ) {
    throw new Error('E2E database fixture lock owner is malformed');
  }

  return { pid: owner.pid as number, token: owner.token };
}

function readLockOwner(path: string): LockOwner {
  return parseLockOwner(JSON.parse(readFileSync(path, 'utf8')));
}

export function databaseRunKey(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.sort();
  url.hash = '';
  return createHash('sha256').update(url.toString()).digest('hex');
}

export function lockPathForDatabase(
  databaseUrl: string,
  directory: string,
): string {
  return join(directory, `${databaseRunKey(databaseUrl)}.lock`);
}

export function processStatus(
  pid: number,
  probe: (pid: number, signal: number) => void = process.kill,
): 'alive' | 'dead' | 'unknown' {
  try {
    probe(pid, 0);
    return 'alive';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM') return 'unknown';
    return 'dead';
  }
}

export function acquireDatabaseLock(
  databaseUrl: string,
  directory = join(tmpdir(), 'mini-workout-e2e-locks'),
): DatabaseLock {
  mkdirSync(directory, { recursive: true });
  const path = lockPathForDatabase(databaseUrl, directory);
  const owner: LockOwner = { pid: process.pid, token: randomUUID() };
  let descriptor: number | undefined;
  let reserved = false;
  let temporaryPath: string | undefined;

  try {
    descriptor = openSync(path, 'wx');
    reserved = true;
    closeSync(descriptor);
    descriptor = undefined;
    temporaryPath = `${path}.${owner.token}.tmp`;
    const temporaryDescriptor = openSync(temporaryPath, 'wx');
    try {
      const contents = Buffer.from(JSON.stringify(owner));
      writeSync(temporaryDescriptor, contents, 0, contents.length, 0);
      fsyncSync(temporaryDescriptor);
    } finally {
      closeSync(temporaryDescriptor);
    }
    renameSync(temporaryPath, path);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (temporaryPath !== undefined) rmSync(temporaryPath, { force: true });
    if (
      reserved &&
      (error as NodeJS.ErrnoException).code !== 'EPERM' &&
      (error as NodeJS.ErrnoException).code !== 'EACCES'
    ) {
      rmSync(path, { force: true });
    }
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
    try {
      const existing = readLockOwner(path);
      const status = processStatus(existing.pid);
      if (status !== 'dead') {
        throw new Error('E2E database fixture run is already in use');
      }
      rmSync(path);
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
        const current = readLockOwner(path);
        if (current.token === owner.token) rmSync(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw error;
      }
    },
  };
}

export function releaseDatabaseLock(
  databaseUrl: string,
  token: string,
  directory = join(tmpdir(), 'mini-workout-e2e-locks'),
): void {
  const path = lockPathForDatabase(databaseUrl, directory);
  try {
    const owner = readLockOwner(path);
    if (owner.token === token) rmSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}
