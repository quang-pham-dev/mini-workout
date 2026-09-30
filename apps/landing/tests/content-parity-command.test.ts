import {
  ContentParityCommandError,
  resolveContentParityRepositoryConfig,
} from '../src/content/content-parity-command.js';
import { describe, expect, it } from 'vitest';

describe('content parity command configuration', () => {
  it('supports fixture parity without provider configuration', () => {
    expect(
      resolveContentParityRepositoryConfig({
        LANDING_CONTENT_SOURCE: 'fixtures',
      }),
    ).toEqual({ contentSource: 'fixtures' });
  });

  it('supports Sanity and Strapi through the same provider-neutral boundary', () => {
    expect(
      resolveContentParityRepositoryConfig({
        LANDING_CONTENT_SOURCE: 'sanity',
        SANITY_PROJECT_ID: 'project-id',
        SANITY_DATASET: 'production',
      }),
    ).toEqual({
      contentSource: 'sanity',
      sanityProjectId: 'project-id',
      sanityDataset: 'production',
    });
    expect(
      resolveContentParityRepositoryConfig({
        LANDING_CONTENT_SOURCE: 'strapi',
        STRAPI_API_URL: 'https://studio.example.com',
        STRAPI_API_READ_TOKEN: 'read-token',
      }),
    ).toEqual({
      contentSource: 'strapi',
      strapiApiUrl: 'https://studio.example.com',
      strapiApiReadToken: 'read-token',
    });
  });

  it.each([
    { LANDING_CONTENT_SOURCE: 'unsupported' },
    { LANDING_CONTENT_SOURCE: 'sanity' },
    { LANDING_CONTENT_SOURCE: 'strapi' },
  ])('fails closed for invalid provider configuration', (env) => {
    expect(() => resolveContentParityRepositoryConfig(env)).toThrowError(
      expect.objectContaining<Partial<ContentParityCommandError>>({
        code: 'CONFIG_INVALID',
      }),
    );
  });
});
