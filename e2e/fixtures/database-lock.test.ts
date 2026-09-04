import { acquireDatabaseLock } from './database-lock.ts';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
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
