import { forwardAuthRequest } from '@/lib/auth-handler';
import { describe, expect, it, vi } from 'vitest';

describe('Better Auth route adapter', () => {
  it.each(['GET', 'POST'])(
    'forwards a %s request and response unchanged',
    async (method) => {
      const request = new Request('https://admin.example/api/auth/session', {
        method,
        headers: { cookie: 'session=test' },
      });
      const expected = new Response('{}', {
        status: 201,
        headers: { 'set-cookie': 'session=next; HttpOnly' },
      });
      const handler = vi.fn().mockResolvedValue(expected);

      await expect(forwardAuthRequest(request, handler)).resolves.toBe(
        expected,
      );
      expect(handler).toHaveBeenCalledWith(request);
    },
  );
});
