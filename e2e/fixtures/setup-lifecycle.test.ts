import { cleanupDatabaseIfOwned } from '../global.teardown.ts';
import { removeFixtureMetadataIfOwned } from './metadata.ts';
import { withFixtureSetup, withFixtureTeardown } from './setup-lifecycle.ts';
import { strict as assert } from 'node:assert';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('failure removes generated auth files and releases the lock', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mini-workout-setup-test-'));
  const authDirectory = join(root, 'auth');
  mkdirSync(authDirectory);
  let released = false;

  try {
    const setupError = new Error('seed failed');
    await assert.rejects(
      withFixtureSetup(
        {
          ownsLock: () => true,
          removeAuth: () =>
            rmSync(authDirectory, { recursive: true, force: true }),
          cleanupDatabase: () => undefined,
          removeMetadata: () => undefined,
          release: () => {
            released = true;
          },
        },
        async () => {
          throw setupError;
        },
      ),
      (error) =>
        error instanceof AggregateError &&
        error.cause === setupError &&
        error.errors.length === 1 &&
        error.errors[0] === setupError,
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
  const metadataError = new Error('metadata cleanup failed');
  const releaseError = new Error('release failed');

  await assert.rejects(
    withFixtureSetup(
      {
        ownsLock: () => true,
        removeAuth: () => undefined,
        cleanupDatabase: () => {
          events.push('database');
        },
        removeMetadata: () => {
          events.push('metadata');
          throw metadataError;
        },
        release: () => {
          events.push('release');
          throw releaseError;
        },
      },
      async () => {
        throw setupError;
      },
    ),
    (error) =>
      error instanceof AggregateError &&
      error.cause === setupError &&
      error.errors[0] === setupError &&
      error.errors[1] === metadataError &&
      error.errors[2] === releaseError,
  );
  assert.deepEqual(events, ['database', 'metadata', 'release']);
});

test('teardown attempts every cleanup and preserves the first cleanup error', async () => {
  const events: string[] = [];
  const cleanupError = new Error('auth cleanup failed');
  const metadataError = new Error('metadata cleanup failed');
  const releaseError = new Error('release failed');

  await assert.rejects(
    withFixtureTeardown({
      ownsLock: () => true,
      removeAuth: () => {
        events.push('auth');
        throw cleanupError;
      },
      cleanupDatabase: () => {
        events.push('database');
      },
      release: () => {
        events.push('release');
        throw releaseError;
      },
      removeMetadata: () => {
        events.push('metadata');
        throw metadataError;
      },
    }),
    (error) =>
      error instanceof AggregateError &&
      error.cause === cleanupError &&
      error.errors[0] === cleanupError &&
      error.errors[1] === metadataError &&
      error.errors[2] === releaseError,
  );
  assert.deepEqual(events, ['auth', 'database', 'metadata', 'release']);
});

test('does not clean database records when another owner holds the canonical lock', async () => {
  const { acquireDatabaseLock } = await import('./database-lock.ts');
  const root = mkdtempSync(join(tmpdir(), 'mini-workout-setup-test-'));
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  let cleaned = false;
  try {
    const owner = acquireDatabaseLock(databaseUrl, root);
    await cleanupDatabaseIfOwned(
      databaseUrl,
      '123e4567-e89b-12d3-a456-426614174000',
      () => {
        cleaned = true;
      },
      root,
    );
    assert.equal(cleaned, false);
    owner.release();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('does not clean database records when setup never acquired a lock', async () => {
  let cleaned = false;
  await cleanupDatabaseIfOwned(
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
    undefined,
    () => {
      cleaned = true;
    },
  );
  assert.equal(cleaned, false);
});

test('removes metadata only when both key and token match', () => {
  const root = mkdtempSync(join(tmpdir(), 'mini-workout-setup-test-'));
  const metadataPath = join(root, 'metadata.json');
  const key = 'a'.repeat(64);
  const token = '123e4567-e89b-12d3-a456-426614174000';

  try {
    writeFileSync(metadataPath, JSON.stringify({ key, token }));
    removeFixtureMetadataIfOwned(
      metadataPath,
      key,
      '123e4567-e89b-12d3-a456-426614174001',
    );
    assert.deepEqual(JSON.parse(readFileSync(metadataPath, 'utf8')), {
      key,
      token,
    });
    removeFixtureMetadataIfOwned(metadataPath, key, token);
    assert.equal(existsSync(metadataPath), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('does not remove newer metadata published after owned cleanup', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mini-workout-setup-test-'));
  const metadataPath = join(root, 'metadata.json');
  const key = 'a'.repeat(64);
  const oldToken = '123e4567-e89b-12d3-a456-426614174000';
  const newToken = '123e4567-e89b-12d3-a456-426614174001';

  try {
    writeFileSync(metadataPath, JSON.stringify({ key, token: oldToken }));
    await withFixtureTeardown({
      ownsLock: () => true,
      removeAuth: () => undefined,
      cleanupDatabase: () => undefined,
      release: () => {
        assert.equal(existsSync(metadataPath), false);
        writeFileSync(metadataPath, JSON.stringify({ key, token: newToken }));
      },
      removeMetadata: () =>
        removeFixtureMetadataIfOwned(metadataPath, key, oldToken),
    });
    assert.deepEqual(JSON.parse(readFileSync(metadataPath, 'utf8')), {
      key,
      token: newToken,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
