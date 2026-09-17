class ExpectedDomainError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class NotFoundError extends ExpectedDomainError {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly category = 'not_found';
  readonly status = 404;
  readonly retryable = false;
  readonly reportable = false;

  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthRequiredError extends ExpectedDomainError {
  readonly code = 'AUTH_REQUIRED';
  readonly category = 'authentication';
  readonly status = 401;
  readonly retryable = false;
  readonly reportable = false;

  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export class UnauthorizedError extends ExpectedDomainError {
  readonly code = 'ADMIN_REQUIRED';
  readonly category = 'authorization';
  readonly status = 403;
  readonly retryable = false;
  readonly reportable = false;

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
export class ConflictError extends ExpectedDomainError {
  readonly code = 'RESOURCE_CONFLICT';
  readonly category = 'conflict';
  readonly status = 409;
  readonly retryable = false;
  readonly reportable = false;

  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class DependencyError extends ExpectedDomainError {
  readonly code = 'DEPENDENCY_UNAVAILABLE';
  readonly category = 'dependency';
  readonly status = 503;
  readonly retryable = true;
  readonly reportable = true;

  constructor(
    message = 'A required dependency is unavailable',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DependencyError';
  }
}

export class ValidationError extends ExpectedDomainError {
  readonly code = 'INPUT_INVALID';
  readonly category = 'validation';
  readonly status = 400;
  readonly retryable = false;
  readonly reportable = false;
  readonly details: { issues: unknown };

  constructor(
    public issues: unknown,
    message = 'Invalid input',
  ) {
    super(message);
    this.name = 'ValidationError';
    this.details = { issues };
  }
}
