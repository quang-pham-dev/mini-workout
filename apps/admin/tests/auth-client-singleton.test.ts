import { authClient } from '@/lib/auth-client';
import { describe, expect, it } from 'vitest';

describe('admin auth client lifecycle', () => {
  it('registers the module instance as the development singleton', () => {
    expect(
      (globalThis as { miniWorkoutAdminAuthClient?: unknown })
        .miniWorkoutAdminAuthClient,
    ).toBe(authClient);
  });
});
