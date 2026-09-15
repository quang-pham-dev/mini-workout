export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
export class ValidationError extends Error {
  constructor(
    public issues: unknown,
    message = 'Invalid input',
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
