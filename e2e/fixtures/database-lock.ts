import { createHash, randomUUID } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type LockOwner = { pid: number; token: string };
export type DatabaseLock = { release: () => void; token: string };
const lockTokenPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertSafeLockToken(token: string): void {
  if (!lockTokenPattern.test(token)) {
    throw new Error('E2E database fixture lock token is malformed');
  }
}

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
    typeof owner.token !== 'string'
  ) {
    throw new Error('E2E database fixture lock owner is malformed');
  }

  assertSafeLockToken(owner.token);
  return { pid: owner.pid as number, token: owner.token };
}

function readLockOwner(path: string): LockOwner {
  const entries = readdirSync(path, { withFileTypes: true });
  if (entries.length !== 1 || !entries[0]?.isDirectory()) {
    throw new Error('E2E database fixture lock owner is malformed');
  }
  const owner = parseLockOwner(
    JSON.parse(readFileSync(join(path, entries[0].name, 'owner'), 'utf8')),
  );
  if (owner.token !== entries[0].name) {
    throw new Error('E2E database fixture lock owner is malformed');
  }
  return owner;
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
    return (error as NodeJS.ErrnoException).code === 'ESRCH'
      ? 'dead'
      : 'unknown';
  }
}

export function acquireDatabaseLock(
  databaseUrl: string,
  directory = join(tmpdir(), 'mini-workout-e2e-locks'),
): DatabaseLock {
  mkdirSync(directory, { recursive: true });
  const path = lockPathForDatabase(databaseUrl, directory);
  const owner: LockOwner = { pid: process.pid, token: randomUUID() };

  while (true) {
    try {
      mkdirSync(path);
      mkdirSync(join(path, owner.token));
      writeFileSync(join(path, owner.token, 'owner'), JSON.stringify(owner));
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      try {
        const existing = readLockOwner(path);
        if (processStatus(existing.pid) !== 'dead') {
          throw new Error('E2E database fixture run is already in use');
        }
        const displacedPath = `${path}.${randomUUID()}.stale`;
        try {
          renameSync(path, displacedPath);
        } catch (renameError) {
          if ((renameError as NodeJS.ErrnoException).code === 'ENOENT')
            continue;
          throw renameError;
        }
        rmSync(displacedPath, { recursive: true });
      } catch (readError) {
        if ((readError as NodeJS.ErrnoException).code === 'ENOENT') continue;
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
  }

  return {
    token: owner.token,
    release: () => {
      try {
        const current = readLockOwner(path);
        if (current.token === owner.token) {
          rmSync(join(path, owner.token), { recursive: true });
          try {
            rmdirSync(path);
          } catch (error) {
            if (
              !['ENOENT', 'ENOTEMPTY'].includes(
                (error as NodeJS.ErrnoException).code ?? '',
              )
            ) {
              throw error;
            }
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw error;
      }
    },
  };
}

export function releaseDatabaseLock(
  databaseUrl: string,
  token: string | undefined,
  directory = join(tmpdir(), 'mini-workout-e2e-locks'),
): void {
  if (token !== undefined) assertSafeLockToken(token);
  const path = lockPathForDatabase(databaseUrl, directory);
  try {
    const owner = readLockOwner(path);
    if (
      (token !== undefined && owner.token === token) ||
      (token === undefined && processStatus(owner.pid) === 'dead')
    ) {
      if (token === undefined) {
        const displacedPath = `${path}.${randomUUID()}.released`;
        renameSync(path, displacedPath);
        rmSync(displacedPath, { recursive: true });
      } else {
        rmSync(join(path, token), { recursive: true });
        try {
          rmdirSync(path);
        } catch (error) {
          if (
            !['ENOENT', 'ENOTEMPTY'].includes(
              (error as NodeJS.ErrnoException).code ?? '',
            )
          ) {
            throw error;
          }
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}
