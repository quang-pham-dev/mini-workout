import {
  CmsConfigurationError,
  validateCmsEnvironment,
} from '../config/validate-environment';
import { describe, expect, it } from 'vitest';

const productionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DATABASE_CLIENT: 'postgres',
  DATABASE_URL: 'postgres://cms:secret@db.internal:5432/cms',
  PUBLIC_URL: 'https://studio.example.com',
  ADMIN_JWT_SECRET: 'a'.repeat(48),
  API_TOKEN_SALT: 'b'.repeat(48),
  APP_KEYS: ['c', 'd', 'e', 'f'].map((value) => value.repeat(48)).join(','),
  ENCRYPTION_KEY: 'g'.repeat(48),
  JWT_SECRET: 'h'.repeat(48),
  TRANSFER_TOKEN_SALT: 'i'.repeat(48),
  LANDING_PREVIEW_URL: 'https://preview.example.com',
  STRAPI_PREVIEW_SECRET: 'j'.repeat(48),
  STRAPI_WEBHOOK_TOKEN: 'k'.repeat(48),
  CMS_UPLOAD_PROVIDER: 'r2',
  R2_ENDPOINT: 'https://account-id.r2.cloudflarestorage.com',
  R2_BUCKET: 'mini-workout-cms',
  R2_ACCESS_KEY_ID: 'l'.repeat(32),
  R2_SECRET_ACCESS_KEY: 'm'.repeat(48),
  R2_PUBLIC_URL: 'https://media.example.com',
};

describe('CMS production environment', () => {
  it('accepts a PostgreSQL production configuration with strong secrets', () => {
    expect(() => validateCmsEnvironment(productionEnvironment)).not.toThrow();
  });

  it('allows SQLite only outside production', () => {
    expect(() =>
      validateCmsEnvironment({
        NODE_ENV: 'development',
        DATABASE_CLIENT: 'sqlite',
      }),
    ).not.toThrow();
    expect(() =>
      validateCmsEnvironment({
        ...productionEnvironment,
        DATABASE_CLIENT: 'sqlite',
      }),
    ).toThrowError(CmsConfigurationError);
  });

  it('rejects placeholders, weak app keys, and non-HTTPS public origins', () => {
    expect(() =>
      validateCmsEnvironment({
        ...productionEnvironment,
        ADMIN_JWT_SECRET: 'replace-me',
      }),
    ).toThrow('ADMIN_JWT_SECRET must be configured for production.');
    expect(() =>
      validateCmsEnvironment({ ...productionEnvironment, APP_KEYS: 'one,two' }),
    ).toThrow('APP_KEYS must contain at least four');
    expect(() =>
      validateCmsEnvironment({
        ...productionEnvironment,
        PUBLIC_URL: 'http://studio.example.com/admin',
      }),
    ).toThrow('PUBLIC_URL must be a valid HTTPS origin.');
    expect(() =>
      validateCmsEnvironment({
        ...productionEnvironment,
        STRAPI_WEBHOOK_TOKEN: 'weak',
      }),
    ).toThrow('STRAPI_WEBHOOK_TOKEN must contain at least 32 characters.');
    expect(() =>
      validateCmsEnvironment({
        ...productionEnvironment,
        LANDING_PREVIEW_URL: 'http://preview.example.com/path',
      }),
    ).toThrow('LANDING_PREVIEW_URL must be a valid HTTPS origin.');
  });

  it('requires durable R2 storage in production', () => {
    expect(() =>
      validateCmsEnvironment({
        ...productionEnvironment,
        CMS_UPLOAD_PROVIDER: 'local',
      }),
    ).toThrow('CMS_UPLOAD_PROVIDER must be r2 in production.');
    expect(() =>
      validateCmsEnvironment({
        ...productionEnvironment,
        R2_PUBLIC_URL: 'http://media.example.com/path',
      }),
    ).toThrow('R2_PUBLIC_URL must be a valid HTTPS origin.');
  });
});
