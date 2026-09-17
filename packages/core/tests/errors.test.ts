import {
  AuthRequiredError,
  ConflictError,
  DependencyError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../src/errors';
import { describe, expect, it } from 'vitest';

describe('domain errors', () => {
  it('exposes stable classification metadata for not-found errors', () => {
    expect(new NotFoundError('Workout not found')).toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      category: 'not_found',
      status: 404,
      retryable: false,
      reportable: false,
    });
  });

  it('exposes authorization metadata without treating denial as an outage', () => {
    expect(new UnauthorizedError('Admin role required')).toMatchObject({
      code: 'ADMIN_REQUIRED',
      category: 'authorization',
      status: 403,
      retryable: false,
      reportable: false,
    });
  });

  it('keeps validation issues available as non-reportable details', () => {
    const issues = [{ path: ['email'], message: 'Invalid email' }];
    expect(new ValidationError(issues)).toMatchObject({
      code: 'INPUT_INVALID',
      category: 'validation',
      status: 400,
      retryable: false,
      reportable: false,
      details: { issues },
    });
  });

  it('distinguishes authentication, conflict, and dependency outcomes', () => {
    expect(new AuthRequiredError()).toMatchObject({
      code: 'AUTH_REQUIRED',
      status: 401,
      reportable: false,
    });
    expect(new ConflictError()).toMatchObject({
      code: 'RESOURCE_CONFLICT',
      status: 409,
      reportable: false,
    });
    expect(new DependencyError()).toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
      status: 503,
      retryable: true,
      reportable: true,
    });
  });
});
