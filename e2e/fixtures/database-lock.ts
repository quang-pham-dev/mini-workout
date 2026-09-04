import { createHash, randomUUID } from 'node:crypto';
import {
  lstatSync,
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
type PendingLock = LockOwner & { createdAt: number };
export type DatabaseLock = { release: () => void; token: string };
const pendingLockMaxAge = 5_000;
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
  if (!lstatSync(path).isDirectory()) {
    throw new Error('E2E database fixture lock owner is malformed');
  }
  const entries = readdirSync(path, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  );
  const ownerEntry = entries[0];
  if (entries.length !== 1 || ownerEntry === undefined) {
    throw new Error('E2E database fixture lock owner is malformed');
  }
  const ownerDirectory = join(path, ownerEntry.name);
  if (!lstatSync(ownerDirectory).isDirectory()) {
    throw new Error('E2E database fixture lock owner is malformed');
  }
  const ownerFile = join(ownerDirectory, 'owner');
  if (!lstatSync(ownerFile).isFile()) {
    throw new Error('E2E database fixture lock owner is malformed');
  }
  const owner = parseLockOwner(JSON.parse(readFileSync(ownerFile, 'utf8')));
  if (owner.token !== ownerEntry.name) {
    throw new Error('E2E database fixture lock owner is malformed');
  }
  return owner;
}

function readPendingLock(path: string): PendingLock {
  const pending = JSON.parse(
    readFileSync(join(path, 'pending'), 'utf8'),
  ) as unknown;
  if (
    typeof pending !== 'object' ||
    pending === null ||
    Array.isArray(pending) ||
    Object.keys(pending).length !== 3
  ) {
    throw new Error('E2E database fixture pending lock is malformed');
  }
  const value = pending as Record<string, unknown>;
  if (
    !Object.hasOwn(value, 'pid') ||
    !Object.hasOwn(value, 'token') ||
    !Object.hasOwn(value, 'createdAt') ||
    !Number.isSafeInteger(value.pid) ||
    (value.pid as number) <= 0 ||
    typeof value.token !== 'string' ||
    !Number.isSafeInteger(value.createdAt) ||
    (value.createdAt as number) > Date.now()
  ) {
    throw new Error('E2E database fixture pending lock is malformed');
  }
  assertSafeLockToken(value.token);
  return {
    pid: value.pid as number,
    token: value.token,
    createdAt: value.createdAt as number,
  };
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

export function isDatabaseLockOwner(
  databaseUrl: string,
  token: string,
  directory = join(tmpdir(), 'mini-workout-e2e-locks'),
): boolean {
  assertSafeLockToken(token);
  const path = lockPathForDatabase(databaseUrl, directory);
  try {
    return readLockOwner(path).token === token;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export function acquireDatabaseLock(
  databaseUrl: string,
  directory = join(tmpdir(), 'mini-workout-e2e-locks'),
  probe: (pid: number, signal: number) => void = process.kill,
): DatabaseLock {
  mkdirSync(directory, { recursive: true });
  const path = lockPathForDatabase(databaseUrl, directory);
  const owner: LockOwner = { pid: process.pid, token: randomUUID() };

  while (true) {
    try {
      mkdirSync(path);
      const pendingPath = join(path, 'pending');
      const pendingTemporaryPath = `${pendingPath}.${randomUUID()}.tmp`;
      writeFileSync(
        pendingTemporaryPath,
        JSON.stringify({ ...owner, createdAt: Date.now() }),
      );
      renameSync(pendingTemporaryPath, pendingPath);
      const ownerTemporaryPath = join(
        path,
        `${owner.token}.${randomUUID()}.tmp`,
      );
      mkdirSync(ownerTemporaryPath);
      writeFileSync(join(ownerTemporaryPath, 'owner'), JSON.stringify(owner));
      renameSync(ownerTemporaryPath, join(path, owner.token));
      rmSync(pendingPath, { force: true });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      try {
        const existing = readLockOwner(path);
        if (processStatus(existing.pid, probe) !== 'dead') {
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
        try {
          const pending = readPendingLock(path);
          if (
            Date.now() - pending.createdAt >= pendingLockMaxAge &&
            processStatus(pending.pid, probe) === 'dead'
          ) {
            const displacedPath = `${path}.${randomUUID()}.stale`;
            renameSync(path, displacedPath);
            rmSync(displacedPath, { recursive: true });
            continue;
          }
        } catch (pendingError) {
          if ((pendingError as NodeJS.ErrnoException).code === 'ENOENT') {
            try {
              lstatSync(path);
            } catch (pathError) {
              if ((pathError as NodeJS.ErrnoException).code === 'ENOENT')
                continue;
              throw pathError;
            }
          }
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
          const claimedPath = `${path}.${randomUUID()}.released`;
          renameSync(join(path, owner.token), claimedPath);
          rmSync(claimedPath, { recursive: true });
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
        const ownerPath = join(path, token);
        if (!lstatSync(ownerPath).isDirectory()) {
          throw new Error('E2E database fixture lock owner is malformed');
        }
        const claimedPath = `${path}.${randomUUID()}.released`;
        renameSync(ownerPath, claimedPath);
        rmSync(claimedPath, { recursive: true });
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
