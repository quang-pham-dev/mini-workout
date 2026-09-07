import {
  acquireDatabaseLock,
  databaseRunKey,
  isDatabaseLockOwner,
  lockPathForDatabase,
  releaseDatabaseLock,
} from './database-lock.ts';
import { authStatePath } from './test.ts';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const url = 'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';

test('resource identity ignores credentials, tuning, protocol spelling and local aliases', () => {
  for (const equivalent of [
    'postgres://other:secret@localhost/mini_workout_e2e?connection_limit=2',
    'postgresql://[::1]:5432/mini_workout_e2e?sslmode=disable',
    'postgresql://127.0.0.1/mini_workout_%65%32%65#ignored',
  ])
    assert.equal(databaseRunKey(url), databaseRunKey(equivalent));
  assert.notEqual(
    databaseRunKey(url),
    databaseRunKey(url.replace('5432', '5433')),
  );
  assert.notEqual(
    databaseRunKey(url),
    databaseRunKey(url.replace('mini_workout_e2e', 'test')),
  );
  assert.throws(
    () => databaseRunKey('postgres://remote.example/test'),
    /disposable/,
  );
});

for (const target of ['canonical', 'token']) {
  test(`release refuses a substituted ${target} symlink`, () => {
    const root = mkdtempSync(join(tmpdir(), 'e2e-lock-'));
    const token = randomUUID();
    const outside = join(root, 'outside');
    const path = lockPathForDatabase(url, root);
    try {
      mkdirSync(join(outside, token), { recursive: true });
      writeFileSync(
        join(outside, token, 'owner'),
        JSON.stringify({ pid: process.pid, token }),
      );
      if (target === 'canonical') symlinkSync(outside, path, 'dir');
      else {
        mkdirSync(path);
        symlinkSync(join(outside, token), join(path, token), 'dir');
      }
      assert.throws(() => releaseDatabaseLock(url, token, root), /malformed/);
      assert.equal(existsSync(join(outside, token, 'owner')), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('auth state requires a run token and has no legacy fallback', () => {
  const token = randomUUID();
  assert.match(
    authStatePath('active', url, token),
    new RegExp(`\\.auth/${databaseRunKey(url)}/${token}/active\\.json$`),
  );
  assert.throws(() => authStatePath('active', url), /token/i);
  assert.throws(() => authStatePath('../outside', url, token), /name/i);
});

for (const state of ['dead', 'malformed', 'pending']) {
  test(`${state} owners fail closed with recovery instructions`, () => {
    const root = mkdtempSync(join(tmpdir(), 'e2e-lock-'));
    const path = lockPathForDatabase(url, root);
    const token = randomUUID();
    try {
      mkdirSync(path);
      if (state !== 'pending') {
        mkdirSync(join(path, token));
        writeFileSync(
          join(path, token, 'owner'),
          state === 'dead' ? JSON.stringify({ pid: 2147483647, token }) : '{',
        );
      }
      assert.throws(
        () => acquireDatabaseLock(url, root),
        /manual.*recover|recover.*manual/i,
      );
      releaseDatabaseLock(url, undefined, root);
      assert.equal(existsSync(path), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('competing URLs and tokens cannot acquire or release an owned resource', () => {
  const root = mkdtempSync(join(tmpdir(), 'e2e-lock-'));
  try {
    const a = acquireDatabaseLock(url, root);
    assert.throws(
      () =>
        acquireDatabaseLock(
          'postgres://other@localhost/mini_workout_e2e',
          root,
        ),
      /already in use/,
    );
    releaseDatabaseLock(url, randomUUID(), root);
    releaseDatabaseLock(url, undefined, root);
    assert.equal(isDatabaseLockOwner(url, a.token, root), true);
    a.release();
    const b = acquireDatabaseLock(url, root);
    a.release();
    assert.equal(isDatabaseLockOwner(url, b.token, root), true);
    b.release();
    assert.equal(existsSync(lockPathForDatabase(url, root)), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
