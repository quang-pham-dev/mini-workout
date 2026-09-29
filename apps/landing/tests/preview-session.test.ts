import {
  createDisablePreviewResponse,
  createEnablePreviewHandler,
  getPreviewState,
} from '../src/preview/session.js';
import { describe, expect, it, vi } from 'vitest';

describe('secure preview session', () => {
  it('records success with a request ID and bounded duration', async () => {
    const recorder = { record: vi.fn() };
    const reporter = { report: vi.fn() };
    const handler = createEnablePreviewHandler({
      createValidator: () => async () => ({ isValid: true }),
      dataset: 'production',
      now: () => 1_800_000_000_000,
      projectId: 'project123',
      recorder,
      reporter,
      token: 'server-secret',
    });

    const response = await handler(
      new Request('https://preview.example.com/api/draft-mode/enable', {
        headers: { 'x-request-id': 'preview-request-1' },
      }),
    );

    expect(response.headers.get('x-request-id')).toBe('preview-request-1');
    expect(recorder.record).toHaveBeenCalledWith({
      at: new Date(1_800_000_000_000).toISOString(),
      durationMs: 0,
      operation: 'preview.enable',
      outcome: 'success',
    });
    expect(reporter.report).not.toHaveBeenCalled();
  });

  it('reports dependency failure once while telemetry failures remain best-effort', async () => {
    const recorder = {
      record: vi.fn(() => {
        throw new Error('recorder secret');
      }),
    };
    const reporter = { report: vi.fn() };
    const handler = createEnablePreviewHandler({
      createValidator: () => async () => {
        throw new Error('provider secret');
      },
      dataset: 'production',
      now: () => 1_800_000_000_000,
      projectId: 'project123',
      recorder,
      reporter,
      token: 'server-secret',
    });

    const response = await handler(
      new Request('https://preview.example.com/api/draft-mode/enable'),
    );

    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(
      /provider secret|recorder secret/i,
    );
    expect(reporter.report).toHaveBeenCalledTimes(1);
    expect(recorder.record).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'preview.enable',
        outcome: 'dependency_failed',
      }),
    );
  });

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
