import { fixtureMetadata } from './metadata.ts';
import { strict as assert } from 'node:assert';
import test from 'node:test';

test('metadata stores only the derived key and run token', () => {
  const metadata = fixtureMetadata(
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
    'run-token',
  );

  assert.deepEqual(metadata, { key: metadata.key, token: 'run-token' });
  assert.equal('databaseUrl' in metadata, false);
  assert.equal(JSON.stringify(metadata).includes('password'), false);
});
