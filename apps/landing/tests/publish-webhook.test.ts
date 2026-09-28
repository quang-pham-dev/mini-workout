import {
  createMemoryDeliveryStore,
  createPublishWebhookHandler,
} from '../src/publish/publish-webhook.js';
import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

const secret = 'sanity-webhook-secret-at-least-thirty-two-characters';
const deployHookUrl =
  'https://api.vercel.com/v1/integrations/deploy/project/hook-secret';
const now = 1_800_000_000_000;
const body = JSON.stringify({ _type: 'article' });

function signature(payload = body, timestamp = Math.floor(now / 1000)) {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('base64url');
  return `t=${timestamp},v1=${digest}`;
}

function request(
  overrides: {
    body?: string;
    idempotencyKey?: string;
    requestId?: string | null;
    signature?: string;
  } = {},
) {
  const requestBody = overrides.body ?? body;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'idempotency-key': overrides.idempotencyKey ?? 'delivery-1',
    'sanity-webhook-signature': overrides.signature ?? signature(requestBody),
  };
  if (overrides.requestId !== null) {
    headers['x-request-id'] = overrides.requestId ?? 'request-1';
  }
  return new Request('https://preview.example.com/api/publish', {
    body: requestBody,
    headers,
    method: 'POST',
  });
}

function setup(
  overrides: {
    fetch?: typeof fetch;
    reporter?: { report: ReturnType<typeof vi.fn> };
  } = {},
) {
  const fetchStub =
    overrides.fetch ??
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 201 }));
  const reporter = overrides.reporter ?? { report: vi.fn() };
  const handler = createPublishWebhookHandler({
    deployHookUrl,
    deliveryStore: createMemoryDeliveryStore(),
    fetch: fetchStub,
    now: () => now,
    reporter,
    webhookSecret: secret,
  });
  return { fetchStub, handler, reporter };
}

describe('Sanity publish webhook', () => {
  it('authenticates the raw body and triggers one bounded Vercel deploy request', async () => {
    const { fetchStub, handler } = setup();

    const response = await handler(request());

    expect(response.status).toBe(202);
    expect(response.headers.get('x-request-id')).toBe('request-1');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      data: { requestId: 'request-1', status: 'accepted' },
    });
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(fetchStub).toHaveBeenCalledWith(
      deployHookUrl,
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    );
  });

  it.each([
    ['missing', ''],
    ['malformed', 'not-a-signature'],
    ['invalid', 't=1800000000,v1=invalid'],
    ['stale', signature(body, Math.floor(now / 1000) - 301)],
  ])(
    'rejects a %s signature without calling or reporting dependencies',
    async (_label, webhookSignature) => {
      const { fetchStub, handler, reporter } = setup();

      const response = await handler(request({ signature: webhookSignature }));

      expect(response.status).toBe(401);
      expect((await response.json()).error).toMatchObject({
        code: 'AUTH_REQUIRED',
        requestId: 'request-1',
      });
      expect(fetchStub).not.toHaveBeenCalled();
      expect(reporter.report).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['malformed JSON', '{'],
    ['non-object JSON', '[]'],
    ['empty JSON', ''],
    ['oversized JSON', JSON.stringify({ value: 'x'.repeat(65_536) })],
  ])('rejects %s without triggering a deploy', async (_label, invalidBody) => {
    const { fetchStub, handler } = setup();

    const response = await handler(
      request({ body: invalidBody, signature: signature(invalidBody) }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INPUT_INVALID');
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('rejects a missing or unsafe idempotency key', async () => {
    const { fetchStub, handler } = setup();

    const response = await handler(request({ idempotencyKey: 'has spaces' }));

    expect(response.status).toBe(400);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('coalesces duplicate delivery keys after the first deploy is accepted', async () => {
    const { fetchStub, handler } = setup();

    expect((await handler(request())).status).toBe(202);
    const duplicate = await handler(request());

    expect(duplicate.status).toBe(202);
    expect(await duplicate.json()).toEqual({
      data: { requestId: 'request-1', status: 'duplicate' },
    });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('maps a failed deploy hook to a retryable dependency error and releases the delivery key', async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    const { handler, reporter } = setup({ fetch: fetchStub });

    const failed = await handler(request());
    const retried = await handler(request());

    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({
      error: {
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Publishing is temporarily unavailable.',
        requestId: 'request-1',
      },
    });
    expect(retried.status).toBe(202);
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(reporter.report).toHaveBeenCalledTimes(1);
    expect(reporter.report).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.not.objectContaining({
          body,
          deployHookUrl,
          secret,
        }),
      }),
    );
  });

  it('keeps the public response stable when the reporter fails', async () => {
    const reporter = {
      report: vi.fn(() => {
        throw new Error('reporter secret');
      }),
    };
    const { handler } = setup({
      fetch: vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error('provider secret')),
      reporter,
    });

    const response = await handler(request());

    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(
      /provider secret|reporter secret/i,
    );
    expect(reporter.report).toHaveBeenCalledTimes(1);
  });

  it('maps an unknown defect once without leaking details and generates a request ID', async () => {
    const reporter = { report: vi.fn() };
    const handler = createPublishWebhookHandler({
      deliveryStore: {
        claim: () => {
          throw new Error('internal secret');
        },
        release: vi.fn(),
      },
      deployHookUrl,
      fetch: vi.fn<typeof fetch>(),
      now: () => now,
      reporter,
      webhookSecret: secret,
    });

    const response = await handler(request({ requestId: null }));
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('x-request-id')).toMatch(/^[a-f0-9-]{36}$/);
    expect(responseBody.error).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      requestId: response.headers.get('x-request-id'),
    });
    expect(JSON.stringify(responseBody)).not.toContain('internal secret');
    expect(reporter.report).toHaveBeenCalledTimes(1);
  });

  it('fails closed when server-only webhook configuration is invalid', async () => {
    const fetchStub = vi.fn<typeof fetch>();
    const handler = createPublishWebhookHandler({
      deployHookUrl: 'https://attacker.example/hook',
      fetch: fetchStub,
      now: () => now,
      reporter: { report: vi.fn() },
      webhookSecret: '',
    });

    const response = await handler(request());

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('CONFIG_INVALID');
    expect(fetchStub).not.toHaveBeenCalled();
  });
});
