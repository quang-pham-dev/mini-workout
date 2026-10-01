import { CmsConfigurationError } from '../config/validate-environment';
import { classifyPublishOutboxError } from '../src/index';
import { describe, expect, it } from 'vitest';

describe('publish outbox error classification', () => {
  it('uses the stable configuration code for known configuration errors', () => {
    expect(
      classifyPublishOutboxError(
        new CmsConfigurationError('Configuration is invalid.'),
      ),
    ).toBe('CONFIG_INVALID');
  });

  it('uses the stable internal code for unexpected processing failures', () => {
    expect(
      classifyPublishOutboxError(new Error('sensitive provider details')),
    ).toBe('INTERNAL_ERROR');
  });
});
