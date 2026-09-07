import { databaseBaseURL } from '../playwright.config.ts';
import { authContextOptions, authRequestOptions } from './auth-request.ts';
import { strict as assert } from 'node:assert';
import test from 'node:test';

test('sends a same-origin header when auth requests carry cookies', () => {
  const baseURL = databaseBaseURL;

  assert.deepEqual(authRequestOptions(baseURL), {
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });
});

test('provides the same origin for browser-context API requests', () => {
  const baseURL = databaseBaseURL;

  assert.deepEqual(authContextOptions(baseURL), {
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });
});
