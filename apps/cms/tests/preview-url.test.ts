import {
  createLandingPreviewUrl,
  getLandingPreviewPath,
} from '../config/preview-url';
import { describe, expect, it } from 'vitest';

describe('Strapi Landing preview URLs', () => {
  it('maps only supported CMS documents to canonical Landing routes', () => {
    expect(
      getLandingPreviewPath('api::article.article', 'gentle-mobility'),
    ).toBe('/articles/gentle-mobility/');
    expect(getLandingPreviewPath('api::pricing-page.pricing-page')).toBe(
      '/pricing/',
    );
    expect(getLandingPreviewPath('api::site-setting.site-setting')).toBeNull();
    expect(getLandingPreviewPath('api::article.article')).toBeNull();
  });

  it('generates a bounded signed URL without exposing the shared secret', () => {
    const result = createLandingPreviewUrl({
      previewOrigin: 'https://preview.example.com',
      secret: 'shared-secret',
      path: '/movement/mobility/',
      status: 'draft',
      expires: 1_800_000_060_000,
    });
    const url = new URL(result);

    expect(url.origin).toBe('https://preview.example.com');
    expect(url.pathname).toBe('/api/preview/strapi');
    expect(url.searchParams.get('path')).toBe('/movement/mobility/');
    expect(url.searchParams.get('signature')).toHaveLength(43);
    expect(result).not.toContain('shared-secret');
  });
});
