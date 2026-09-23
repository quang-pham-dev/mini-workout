import { type CapturedAuthEmail, extractEmailToken } from './email-capture.ts';
import { strict as assert } from 'node:assert';
import test from 'node:test';

test('extracts token from search parameters (query string format)', () => {
  const email: CapturedAuthEmail = {
    kind: 'verification',
    to: 'user@example.test',
    url: 'http://localhost:3001/api/auth/verify-email?token=query-token-123',
    subject: 'Verify',
    text: '',
    html: '',
    createdAt: new Date().toISOString(),
  };

  assert.equal(extractEmailToken(email), 'query-token-123');
});

test('extracts token from path segment (pathname format)', () => {
  const email: CapturedAuthEmail = {
    kind: 'password-reset',
    to: 'user@example.test',
    url: 'http://localhost:3001/api/auth/reset-password/path-token-456',
    subject: 'Reset',
    text: '',
    html: '',
    createdAt: new Date().toISOString(),
  };

  assert.equal(extractEmailToken(email), 'path-token-456');
});

test('returns null when no token is present', () => {
  const email: CapturedAuthEmail = {
    kind: 'password-reset',
    to: 'user@example.test',
    url: 'http://localhost:3001/api/auth/reset-password/',
    subject: 'Reset',
    text: '',
    html: '',
    createdAt: new Date().toISOString(),
  };

  assert.equal(extractEmailToken(email), null);
});
