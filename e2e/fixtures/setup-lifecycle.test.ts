import { withFixtureSetup, withFixtureTeardown } from './setup-lifecycle.ts';
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
        () => undefined,
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

test('attempts metadata removal and release even when earlier cleanup fails', async () => {
  const events: string[] = [];
  const setupError = new Error('seed failed');

  await assert.rejects(
    withFixtureSetup(
      '/unused-auth-directory',
      () => {
        events.push('metadata');
        throw new Error('metadata cleanup failed');
      },
      () => {
        events.push('release');
        throw new Error('release failed');
      },
      async () => {
        throw setupError;
      },
    ),
    (error) => error === setupError,
  );
  assert.deepEqual(events, ['release', 'metadata']);
});

test('teardown attempts every cleanup and preserves the first cleanup error', async () => {
  const events: string[] = [];
  const cleanupError = new Error('auth cleanup failed');

  await assert.rejects(
    withFixtureTeardown(
      () => {
        events.push('auth');
        throw cleanupError;
      },
      () => events.push('database'),
      () => {
        events.push('release');
        throw new Error('release failed');
      },
      () => {
        events.push('metadata');
        throw new Error('metadata cleanup failed');
      },
    ),
    (error) => error === cleanupError,
  );
  assert.deepEqual(events, ['auth', 'database', 'release', 'metadata']);
});
