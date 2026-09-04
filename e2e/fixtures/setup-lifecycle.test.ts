import { withFixtureSetup } from './setup-lifecycle.ts';
import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('failure removes generated auth files and releases the lock', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mini-workout-setup-test-'));
  const authDirectory = join(root, 'auth');
  mkdirSync(authDirectory);
  let released = false;

  try {
    await assert.rejects(
      withFixtureSetup(
        authDirectory,
        () => {
          released = true;
        },
        async () => {
          throw new Error('seed failed');
        },
      ),
      /seed failed/,
    );
    assert.equal(existsSync(authDirectory), false);
    assert.equal(released, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
