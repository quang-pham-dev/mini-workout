import {
  createDisablePreviewResponse,
  createEnablePreviewHandler,
  getPreviewState,
} from '../src/preview/session.js';
import { describe, expect, it, vi } from 'vitest';

describe('secure preview session', () => {
  it('fails closed when server-only preview configuration is missing', async () => {
    const validate = vi.fn();
    const handler = createEnablePreviewHandler({
      createValidator: validate,
      projectId: '',
      dataset: 'production',
      token: '',
    });

    const response = await handler(
      new Request('https://preview.example.com/api/draft-mode/enable'),
    );

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Preview is unavailable.');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(validate).not.toHaveBeenCalled();
  });

  it('rejects an invalid secret without setting a cookie or leaking details', async () => {
    const handler = createEnablePreviewHandler({
      createValidator: () => async () => ({ isValid: false }),
      projectId: 'project123',
      dataset: 'production',
      token: 'server-secret',
    });

    const response = await handler(
      new Request(
        'https://preview.example.com/api/draft-mode/enable?sanity-preview-secret=bad',
      ),
    );

    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Preview authorization failed.');
    expect(response.headers.has('set-cookie')).toBe(false);
  });

  it('sets a hardened preview cookie and redirects only within the preview origin', async () => {
    const handler = createEnablePreviewHandler({
      createValidator: () => async () => ({
        isValid: true,
        redirectTo: '/movement/mobility/',
        studioPreviewPerspective: 'drafts',
      }),
      projectId: 'project123',
      dataset: 'production',
      token: 'server-secret',
    });

    const response = await handler(
      new Request('https://preview.example.com/api/draft-mode/enable'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/movement/mobility/');
    expect(response.headers.get('set-cookie')).toMatch(
      /^sanity-preview-perspective=drafts; Path=\/; Max-Age=3600; Secure; SameSite=Lax$/,
    );
    expect(response.headers.get('set-cookie')).not.toContain('HttpOnly');
  });

  it('neutralizes an external redirect returned by the provider boundary', async () => {
    const handler = createEnablePreviewHandler({
      createValidator: () => async () => ({
        isValid: true,
        redirectTo: 'https://attacker.example/',
        studioPreviewPerspective: 'drafts',
      }),
      projectId: 'project123',
      dataset: 'production',
      token: 'server-secret',
    });

    const response = await handler(
      new Request('https://preview.example.com/api/draft-mode/enable'),
    );
    expect(response.headers.get('location')).toBe('/');
  });

  it('detects preview state and always forces noindex', () => {
    expect(
      getPreviewState(new Request('https://preview.example.com/')),
    ).toEqual({ enabled: false, noindex: true });
    expect(
      getPreviewState(
        new Request('https://preview.example.com/', {
          headers: { cookie: 'sanity-preview-perspective=drafts' },
        }),
      ),
    ).toEqual({ enabled: true, noindex: true });
  });

  it('clears preview state without accepting a redirect parameter', () => {
    const response = createDisablePreviewResponse();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
