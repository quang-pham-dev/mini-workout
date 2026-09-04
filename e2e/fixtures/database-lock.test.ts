import {
  acquireDatabaseLock,
  databaseRunKey,
  isDatabaseLockOwner,
  lockPathForDatabase,
  processStatus,
  releaseDatabaseLock,
} from './database-lock.ts';
import { authStatePath } from './test.ts';
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('rejects a second fixture owner for the same database', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';

  try {
    const first = acquireDatabaseLock(databaseUrl, lockDirectory);
    assert.throws(
      () => acquireDatabaseLock(databaseUrl, lockDirectory),
      /already in use|concurrent/i,
    );
    first.release();
    assert.doesNotThrow(() => {
      const second = acquireDatabaseLock(databaseUrl, lockDirectory);
      second.release();
    });
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

test('uses distinct stable keys for distinct canonical database URLs', () => {
  const first =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e?z=1&a=2#ignored';
  const equivalent =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e?a=2&z=1';
  const second =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_test?sslmode=disable';

  assert.equal(databaseRunKey(first), databaseRunKey(equivalent));
  assert.notEqual(databaseRunKey(first), databaseRunKey(second));
});

test('does not remove an incomplete lock', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const path = lockPathForDatabase(databaseUrl, lockDirectory);

  try {
    mkdirSync(path);
    mkdirSync(join(path, 'token'));
    writeFileSync(join(path, 'token', 'owner'), '{"pid":', 'utf8');
    assert.throws(() => acquireDatabaseLock(databaseUrl, lockDirectory));
    assert.equal(existsSync(path), true);
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

for (const [name, owner] of [
  ['non-object JSON', []],
  ['missing pid', { token: 'token' }],
  ['non-positive pid', { pid: 0, token: 'token' }],
  ['fractional pid', { pid: 1.5, token: 'token' }],
  ['empty token', { pid: 123, token: '' }],
] as const) {
  test(`does not take over a lock with ${name}`, () => {
    const lockDirectory = mkdtempSync(
      join(tmpdir(), 'mini-workout-lock-test-'),
    );
    const databaseUrl =
      'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
    const path = lockPathForDatabase(databaseUrl, lockDirectory);

    try {
      mkdirSync(path);
      mkdirSync(join(path, 'token'));
      writeFileSync(
        join(path, 'token', 'owner'),
        JSON.stringify(owner),
        'utf8',
      );
      assert.throws(() => acquireDatabaseLock(databaseUrl, lockDirectory));
      assert.equal(existsSync(path), true);
    } finally {
      rmSync(lockDirectory, { recursive: true, force: true });
    }
  });
}

test('preserves a lock when its owner process status is unknown', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const path = lockPathForDatabase(databaseUrl, lockDirectory);
  const token = '123e4567-e89b-12d3-a456-426614174000';

  try {
    mkdirSync(join(path, token), { recursive: true });
    writeFileSync(
      join(path, token, 'owner'),
      JSON.stringify({ pid: 123, token }),
    );
    assert.throws(
      () =>
        acquireDatabaseLock(databaseUrl, lockDirectory, () => {
          const error = new Error('probe failed') as NodeJS.ErrnoException;
          error.code = 'EACCES';
          throw error;
        }),
      /already in use|unknown/i,
    );
    assert.equal(existsSync(path), true);
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

test('recovers an aged pending claim owned by a dead process', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const path = lockPathForDatabase(databaseUrl, lockDirectory);

  try {
    mkdirSync(path);
    writeFileSync(
      join(path, 'pending'),
      JSON.stringify({
        pid: 2_147_483_647,
        token: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: Date.now() - 60_000,
      }),
    );
    const old = new Date(Date.now() - 60_000);
    utimesSync(path, old, old);
    const lock = acquireDatabaseLock(databaseUrl, lockDirectory);
    lock.release();
    assert.equal(existsSync(path), false);
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

test('does not take over a valid lock when its owner is still running', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const path = lockPathForDatabase(databaseUrl, lockDirectory);

  try {
    mkdirSync(path);
    const token = '123e4567-e89b-12d3-a456-426614174000';
    mkdirSync(join(path, token));
    writeFileSync(
      join(path, token, 'owner'),
      JSON.stringify({ pid: process.pid, token }),
      'utf8',
    );
    assert.throws(() => acquireDatabaseLock(databaseUrl, lockDirectory));
    assert.equal(existsSync(path), true);
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

test('takes over a stale lock only when its owner is definitely dead', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const path = lockPathForDatabase(databaseUrl, lockDirectory);

  try {
    mkdirSync(path);
    mkdirSync(join(path, '123e4567-e89b-12d3-a456-426614174000'));
    writeFileSync(
      join(path, '123e4567-e89b-12d3-a456-426614174000', 'owner'),
      JSON.stringify({
        pid: 2_147_483_647,
        token: '123e4567-e89b-12d3-a456-426614174000',
      }),
      'utf8',
    );
    const lock = acquireDatabaseLock(databaseUrl, lockDirectory);
    lock.release();
    assert.equal(existsSync(path), false);
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

test('allows only one process to take over the same stale lock', async () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const path = lockPathForDatabase(databaseUrl, lockDirectory);
  const barrier = join(lockDirectory, 'start');
  mkdirSync(path);
  mkdirSync(join(path, '123e4567-e89b-12d3-a456-426614174000'));
  writeFileSync(
    join(path, '123e4567-e89b-12d3-a456-426614174000', 'owner'),
    JSON.stringify({
      pid: 2_147_483_647,
      token: '123e4567-e89b-12d3-a456-426614174000',
    }),
  );
  try {
    const childPath = fileURLToPath(
      new URL('./database-lock-race-child.ts', import.meta.url),
    );
    const children = [1, 2].map(() => {
      let resolveReady!: () => void;
      const ready = new Promise<void>((resolve) => {
        resolveReady = resolve;
      });
      const done = new Promise<number | null>((resolve) => {
        const child = spawn(
          process.execPath,
          ['--experimental-strip-types', childPath],
          {
            env: {
              ...process.env,
              LOCK_DIRECTORY: lockDirectory,
              LOCK_BARRIER: barrier,
              LOCK_RELEASE: join(lockDirectory, 'release'),
            },
          },
        );
        child.stdout.once('data', resolveReady);
        child.on('close', (status) => {
          resolveReady();
          resolve(status);
        });
      });
      return { ready, done };
    });
    writeFileSync(barrier, 'go');
    await Promise.all(children.map(({ ready }) => ready));
    assert.equal(
      readdirSync(path, { withFileTypes: true }).filter((entry) =>
        entry.isDirectory(),
      ).length,
      1,
    );
    writeFileSync(join(lockDirectory, 'release'), 'go');
    const statuses = await Promise.all(children.map(({ done }) => done));
    assert.equal(statuses.filter((status) => status === 0).length, 1);
    assert.equal(statuses.filter((status) => status !== 0).length, 1);
    assert.equal(existsSync(path), false);
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

for (const code of ['EPERM', 'EACCES', 'EINVAL', 'EIO'] as const) {
  test(`treats ${code} while probing an owner as unknown`, () => {
    assert.equal(
      processStatus(123, () => {
        const error = new Error('probe failed') as NodeJS.ErrnoException;
        error.code = code;
        throw error;
      }),
      'unknown',
    );
  });
}

test('does not remove a replacement lock during release', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const path = lockPathForDatabase(databaseUrl, lockDirectory);

  try {
    const first = acquireDatabaseLock(databaseUrl, lockDirectory);
    rmSync(path, { recursive: true, force: true });
    const replacement = acquireDatabaseLock(databaseUrl, lockDirectory);

    first.release();
    assert.equal(existsSync(path), true);
    replacement.release();
    assert.equal(existsSync(path), false);
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

test('keys auth state paths by the canonical database URL', () => {
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  assert.match(
    authStatePath('active', databaseUrl),
    /\.auth\/[^/]+\/active\.json$/,
  );
});

test('rejects unsafe release tokens before using them as paths', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  try {
    assert.throws(
      () =>
        releaseDatabaseLock(
          'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
          '../outside',
          lockDirectory,
        ),
      /token/i,
    );
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

test('does not confirm ownership for a competing token', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  try {
    const owner = acquireDatabaseLock(databaseUrl, lockDirectory);
    assert.equal(
      isDatabaseLockOwner(
        databaseUrl,
        '123e4567-e89b-12d3-a456-426614174000',
        lockDirectory,
      ),
      false,
    );
    owner.release();
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

test('does not release through a substituted token symlink', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const outside = join(lockDirectory, 'outside');
  const token = '123e4567-e89b-12d3-a456-426614174000';
  try {
    mkdirSync(outside);
    writeFileSync(join(outside, 'sentinel'), 'keep');
    const path = lockPathForDatabase(databaseUrl, lockDirectory);
    mkdirSync(path);
    writeFileSync(
      join(path, 'owner'),
      JSON.stringify({ pid: process.pid, token }),
    );
    symlinkSync(outside, join(path, token), 'dir');
    assert.throws(
      () => releaseDatabaseLock(databaseUrl, token, lockDirectory),
      /owner|directory|symlink/i,
    );
    assert.equal(existsSync(join(outside, 'sentinel')), true);
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

test('does not release through a substituted canonical lock path', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const outside = join(lockDirectory, 'outside');
  const token = '123e4567-e89b-12d3-a456-426614174000';
  try {
    mkdirSync(outside);
    mkdirSync(join(outside, token));
    writeFileSync(
      join(outside, token, 'owner'),
      JSON.stringify({ pid: process.pid, token }),
    );
    symlinkSync(
      outside,
      lockPathForDatabase(databaseUrl, lockDirectory),
      'dir',
    );
    assert.throws(
      () => releaseDatabaseLock(databaseUrl, token, lockDirectory),
      /owner|directory|symlink/i,
    );
    assert.equal(existsSync(join(outside, token, 'owner')), true);
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});

test('releases a definitely-dead lock without metadata token', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const path = lockPathForDatabase(databaseUrl, lockDirectory);
  const token = '123e4567-e89b-12d3-a456-426614174000';
  try {
    mkdirSync(join(path, token), { recursive: true });
    writeFileSync(
      join(path, token, 'owner'),
      JSON.stringify({ pid: 2_147_483_647, token }),
    );
    releaseDatabaseLock(databaseUrl, undefined, lockDirectory);
    assert.equal(existsSync(path), false);
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
});
