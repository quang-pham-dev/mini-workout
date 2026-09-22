import {
  AuthEmailConfigurationError,
  AuthEmailDeliveryError,
  assertAuthEmailConfiguration,
  createAuthEmailSender,
} from '../src/email';
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
});
