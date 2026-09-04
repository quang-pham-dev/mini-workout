import {
  acquireDatabaseLock,
  databaseRunKey,
  lockPathForDatabase,
  processStatus,
} from './database-lock.ts';
import { authStatePath } from './test.ts';
import { strict as assert } from 'node:assert';
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
    mkdirSync(join(path, 'stale-token'));
    writeFileSync(
      join(path, 'stale-token', 'owner'),
      JSON.stringify({ pid: 2_147_483_647, token: 'stale-token' }),
      'utf8',
    );
    const lock = acquireDatabaseLock(databaseUrl, lockDirectory);
    lock.release();
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
