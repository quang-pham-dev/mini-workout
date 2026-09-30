import {
  createMemoryStrapiDeliveryStore,
  createStrapiPublishWebhookHandler,
} from '../src/publish/strapi-publish-webhook.js';
import { describe, expect, it, vi } from 'vitest';

const token = 'strapi-webhook-token-at-least-thirty-two-characters';
const deployHookUrl =
  'https://api.vercel.com/v1/integrations/deploy/project/hook-secret';
const now = Date.parse('2026-09-30T08:00:00.000Z');
const body = JSON.stringify({
  createdAt: new Date(now).toISOString(),
  event: 'entry.publish',
  model: 'api::article.article',
});

function request(
  overrides: { body?: string; token?: string; requestId?: string | null } = {},
) {
  const headers: Record<string, string> = {
    authorization: `Bearer ${overrides.token ?? token}`,
    'content-type': 'application/json',
  };
  if (overrides.requestId !== null) {
    headers['x-request-id'] = overrides.requestId ?? 'request-1';
  }
  return new Request(
    'https://preview.example.com/api/webhooks/strapi/publish',
    {
      body: overrides.body ?? body,
      headers,
      method: 'POST',
    },
  );
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
  return {
    fetchStub,
    handler: createStrapiPublishWebhookHandler({
      deliveryStore: createMemoryStrapiDeliveryStore(),
      deployHookUrl,
      fetch: fetchStub,
      now: () => now,
      reporter,
      webhookToken: token,
    }),
    reporter,
  };
}

describe('Strapi publish webhook', () => {
  it('accepts an allowlisted publish event and triggers a bounded deploy', async () => {
    const { fetchStub, handler } = setup();
    const response = await handler(request());

    expect(response.status).toBe(202);
    expect(response.headers.get('x-request-id')).toBe('request-1');
    expect(await response.json()).toEqual({
      data: { requestId: 'request-1', status: 'accepted' },
    });
    expect(fetchStub).toHaveBeenCalledWith(
      deployHookUrl,
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    );
  });

  it('rejects invalid authentication without reporting or deploying', async () => {
    const { fetchStub, handler, reporter } = setup();
    const response = await handler(request({ token: 'wrong' }));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('AUTH_REQUIRED');
    expect(fetchStub).not.toHaveBeenCalled();
    expect(reporter.report).not.toHaveBeenCalled();
  });

  it.each([
    ['draft update', { event: 'entry.update' }],
    ['unknown model', { model: 'api::secret.secret' }],
    ['stale event', { createdAt: '2026-09-30T07:54:59.000Z' }],
  ])('rejects %s without deploying', async (_name, override) => {
    const { fetchStub, handler } = setup();
    const invalidBody = JSON.stringify({
      createdAt: new Date(now).toISOString(),
      event: 'entry.publish',
      model: 'api::article.article',
      ...override,
    });
    const response = await handler(request({ body: invalidBody }));

    expect(response.status).toBe(400);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('deduplicates identical deliveries within the replay window', async () => {
    const { fetchStub, handler } = setup();
    expect((await handler(request())).status).toBe(202);
    const duplicate = await handler(request());

    expect(await duplicate.json()).toEqual({
      data: { requestId: 'request-1', status: 'duplicate' },
    });
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('accepts Strapi media payloads that do not include a model field', async () => {
    const { handler } = setup();
    const response = await handler(
      request({
        body: JSON.stringify({
          createdAt: new Date(now).toISOString(),
          event: 'media.update',
          media: { id: 1 },
        }),
      }),
    );

    expect(response.status).toBe(202);
  });

  it('reports dependency failure once, returns safe output, and permits retry', async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('provider token leak'))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    const { handler, reporter } = setup({ fetch: fetchStub });

    const failed = await handler(request());
    const retried = await handler(request());

    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain('provider token leak');
    expect(retried.status).toBe(202);
    expect(reporter.report).toHaveBeenCalledTimes(1);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it('fails closed for unsafe configuration and creates a request ID', async () => {
    const handler = createStrapiPublishWebhookHandler({
      deployHookUrl: 'https://attacker.example/hook',
      reporter: { report: vi.fn() },
      webhookToken: '',
    });
    const response = await handler(request({ requestId: null }));

    expect(response.status).toBe(503);
    expect(response.headers.get('x-request-id')).toMatch(/^[a-f0-9-]{36}$/);
    expect((await response.json()).error.code).toBe('CONFIG_INVALID');
  });
});
