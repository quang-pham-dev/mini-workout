import {
  fixtureArtifactPaths,
  fixtureMetadata,
  parseFixtureMetadata,
} from './metadata.ts';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import test from 'node:test';

test('production artifact paths scope metadata by run outside the auth directory', () => {
  const url = 'postgresql://localhost/test';
  const token = '123e4567-e89b-12d3-a456-426614174000';
  const paths = fixtureArtifactPaths(url, token, '/tmp/auth-contract');
  assert.equal(
    paths.authDirectory,
    join('/tmp/auth-contract', fixtureMetadata(url, token).key, token),
  );
  assert.equal(paths.metadataPath, `${paths.authDirectory}.json`);
  assert.throws(() => fixtureArtifactPaths(url, '../outside'), /token/);
});

test('metadata stores only the derived key and run token', () => {
  const metadata = fixtureMetadata(
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
    '123e4567-e89b-12d3-a456-426614174000',
  );

  assert.deepEqual(metadata, {
    key: metadata.key,
    token: '123e4567-e89b-12d3-a456-426614174000',
  });
  assert.equal('databaseUrl' in metadata, false);
  assert.equal(JSON.stringify(metadata).includes('password'), false);
});

test('rejects metadata whose token or database key is not owned by this run', () => {
  const metadata = fixtureMetadata(
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
    '123e4567-e89b-12d3-a456-426614174000',
  );
  assert.throws(
    () =>
      parseFixtureMetadata({ ...metadata, token: '../outside' }, metadata.key),
    /malformed/,
  );
  assert.throws(
    () =>
      parseFixtureMetadata({ ...metadata, key: 'a'.repeat(64) }, metadata.key),
    /malformed/,
  );
});
