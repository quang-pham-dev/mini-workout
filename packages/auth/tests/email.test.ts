import {
  AuthEmailConfigurationError,
  AuthEmailDeliveryError,
  assertAuthEmailConfiguration,
  createAuthEmailSender,
} from '../src/email';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('auth email sender', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fails closed when Resend is not configured', async () => {
    const send = createAuthEmailSender({});
    await expect(
      send({
        kind: 'verification',
        to: 'user@example.test',
        url: 'https://example.test/verify',
      }),
    ).rejects.toBeInstanceOf(AuthEmailConfigurationError);
  });

  it('validates required provider configuration before enabling verification', () => {
    expect(() => assertAuthEmailConfiguration({})).toThrow(
      AuthEmailConfigurationError,
    );
    expect(() =>
      assertAuthEmailConfiguration({
        RESEND_API_KEY: 'key',
        AUTH_EMAIL_FROM: 'from@example.test',
      }),
    ).not.toThrow();
  });

  it('sends provider-neutral verification content through Resend', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const send = createAuthEmailSender({
      RESEND_API_KEY: 'test-key',
      AUTH_EMAIL_FROM: 'Mini Workout <no-reply@example.test>',
      RESEND_API_URL: 'https://resend.example.test/emails',
    });

    await send({
      kind: 'verification',
      to: 'user@example.test',
      url: 'https://example.test/verify?token=<safe>',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://resend.example.test/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1];
    expect(String(request?.body)).toContain('&lt;safe&gt;');
  });

  it('maps provider failures to a generic delivery error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('secret', { status: 500 }),
    );
    const send = createAuthEmailSender({
      RESEND_API_KEY: 'key',
      AUTH_EMAIL_FROM: 'from@example.test',
    });
    await expect(
      send({
        kind: 'password-reset',
        to: 'user@example.test',
        url: 'https://example.test/reset',
      }),
    ).rejects.toBeInstanceOf(AuthEmailDeliveryError);
  });

  it('captures fake E2E messages as structured JSONL without calling Resend', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mini-workout-email-'));
    const captureFile = join(root, 'messages.jsonl');
    const send = createAuthEmailSender({
      NODE_ENV: 'production',
      AUTH_EMAIL_PROVIDER: 'fake',
      AUTH_EMAIL_CAPTURE_FILE: captureFile,
      DATABASE_URL:
        'postgresql://postgres:postgres@127.0.0.1:5432/mini_workout_e2e',
      E2E_DATABASE_URL:
        'postgresql://postgres:postgres@127.0.0.1:5432/mini_workout_e2e',
    });

    await send({
      kind: 'verification',
      to: 'user@example.test',
      url: 'http://localhost:3001/api/auth/verify-email?token=test-token',
    });

    const [message] = (await readFile(captureFile, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(message).toMatchObject({
      kind: 'verification',
      to: 'user@example.test',
      url: 'http://localhost:3001/api/auth/verify-email?token=test-token',
      subject: 'Verify your Mini Workout email',
    });
  });

  it('rejects the fake provider outside a disposable E2E database', () => {
    expect(() =>
      createAuthEmailSender({
        NODE_ENV: 'production',
        AUTH_EMAIL_PROVIDER: 'fake',
        AUTH_EMAIL_CAPTURE_FILE: '/tmp/messages.jsonl',
      }),
    ).toThrow(AuthEmailConfigurationError);
    expect(() =>
      createAuthEmailSender({
        NODE_ENV: 'production',
        AUTH_EMAIL_PROVIDER: 'fake',
        AUTH_EMAIL_CAPTURE_FILE: '/tmp/messages.jsonl',
        DATABASE_URL:
          'postgresql://postgres:postgres@127.0.0.1:5432/mini_workout_e2e?host=remote.example',
        E2E_DATABASE_URL:
          'postgresql://postgres:postgres@127.0.0.1:5432/mini_workout_e2e?host=remote.example',
      }),
    ).toThrow(AuthEmailConfigurationError);
  });
});
