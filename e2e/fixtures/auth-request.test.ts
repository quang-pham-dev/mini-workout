import { authRequestOptions } from './auth-request.ts';
import { strict as assert } from 'node:assert';
import test from 'node:test';

test('sends a same-origin header when auth requests carry cookies', () => {
  const baseURL = 'http://localhost:3001';

  assert.deepEqual(authRequestOptions(baseURL), {
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });
});
