import {
  acquireDatabaseLock,
  databaseRunKey,
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
  rmSync,
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
  ['empty token', { pid: 123, token: ' ' }],
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

test('does not take over a valid lock when its owner is still running', () => {
  const lockDirectory = mkdtempSync(join(tmpdir(), 'mini-workout-lock-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  const path = lockPathForDatabase(databaseUrl, lockDirectory);

  try {
    mkdirSync(path);
    mkdirSync(join(path, 'token'));
    writeFileSync(
      join(path, 'token', 'owner'),
      JSON.stringify({ pid: process.pid, token: 'token' }),
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
    const children = [1, 2].map(
      () =>
        new Promise<number | null>((resolve) => {
          const child = spawn(
            process.execPath,
            ['--experimental-strip-types', childPath],
            {
              env: {
                ...process.env,
                LOCK_DIRECTORY: lockDirectory,
                LOCK_BARRIER: barrier,
              },
            },
          );
          child.on('close', resolve);
        }),
    );
    writeFileSync(barrier, 'go');
    const statuses = await Promise.all(children);
    assert.equal(statuses.filter((status) => status === 0).length, 1);
    assert.equal(statuses.filter((status) => status !== 0).length, 1);
    assert.equal(existsSync(path), true);
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
