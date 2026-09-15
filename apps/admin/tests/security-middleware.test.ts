import { withSecurityHeaders } from '@/lib/security';
import { describe, expect, it, vi } from 'vitest';

describe('security response middleware', () => {
  it('sets headers before a downstream redirect is thrown', async () => {
    const events: string[] = [];
    const redirect = new Error('redirect');
    const setHeader = vi.fn((name: string) => events.push(`header:${name}`));
    const next = vi.fn(async () => {
      events.push('next');
      throw redirect;
    });

    await expect(withSecurityHeaders(next, setHeader)).rejects.toBe(redirect);
    expect(events.at(-1)).toBe('next');
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.any(String),
    );
    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });

  it('preserves the downstream response while applying security headers', async () => {
    const response = new Response('Not found', { status: 404 });
    const result = { response };
    const setHeader = vi.fn();

    await expect(
      withSecurityHeaders(async () => result, setHeader),
    ).resolves.toBe(result);
    expect(setHeader).toHaveBeenCalledWith(
      'Referrer-Policy',
      'strict-origin-when-cross-origin',
    );
    expect(response.headers.get('content-security-policy')).toBeTruthy();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('adds headers to the actual redirect response, not only event defaults', async () => {
    const response = new Response(null, {
      status: 307,
      headers: { Location: '/login' },
    });

    await withSecurityHeaders(async () => ({ response }), vi.fn());
    expect(response.headers.get('content-security-policy')).toBeTruthy();
    expect(response.headers.get('location')).toBe('/login');
  });
});
