import type { LogContext, Logger } from './logger';

export type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'dependency'
  | 'configuration'
  | 'internal';

export type ErrorCode =
  | 'INPUT_INVALID'
  | 'AUTH_REQUIRED'
  | 'ADMIN_REQUIRED'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_CONFLICT'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'CONFIG_INVALID'
  | 'INTERNAL_ERROR'
  | (string & {});

export interface AppErrorOptions {
  code: ErrorCode;
  category: ErrorCategory;
  message: string;
  status: number;
  retryable: boolean;
  reportable: boolean;
  cause?: unknown;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly status: number;
  readonly retryable: boolean;
  readonly reportable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    this.category = options.category;
    this.status = options.status;
    this.retryable = options.retryable;
    this.reportable = options.reportable;
    this.details = options.details;
  }
}

export interface ErrorContext extends LogContext {
  service: string;
  operation?: string;
  route?: string;
  requestId?: string;
  traceId?: string;
  release?: string;
  environment?: string;
}

export interface ClassifiedError {
  error: Error;
  code: ErrorCode;
  category: ErrorCategory;
  status: number;
  publicMessage: string;
  retryable: boolean;
  reportable: boolean;
  fingerprint: string;
  controlFlow: boolean;
  requestId?: string;
}

interface AppErrorLike {
  code: ErrorCode;
  category: ErrorCategory;
  status: number;
  retryable: boolean;
  reportable: boolean;
  message: string;
}

export interface ErrorReport {
  error: Error;
  context?: LogContext;
}

export interface ErrorReporter {
  report(report: ErrorReport): void;
}

export function createReportOnce(reporter: ErrorReporter): ErrorReporter {
  let hasReported = false;

  return {
    report: (report) => {
      if (hasReported) return;
      hasReported = true;
      try {
        reporter.report(report);
      } catch {
        // Telemetry must never replace or fail the original application error.
      }
    },
  };
}

export function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function isFrameworkControlFlow(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))
  );
}

function fingerprint(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeFingerprintMessage(message: string): string {
  return message
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ':id')
    .replace(/\b\d+\b/g, ':number')
    .replace(/\s+/g, ' ')
    .slice(0, 240);
}

function isDependencyFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return (
    code === 'P1001' ||
    code === 'P1002' ||
    code === 'P2024' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND'
  );
}

function isAppErrorLike(error: unknown): error is AppErrorLike {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as Partial<AppErrorLike>;
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.status === 'number' &&
    typeof candidate.retryable === 'boolean' &&
    typeof candidate.reportable === 'boolean' &&
    typeof candidate.message === 'string'
  );
}

export function classifyError(
  error: unknown,
  context: ErrorContext,
): ClassifiedError {
  const normalized = normalizeError(error);
  if (isFrameworkControlFlow(error)) {
    return {
      error: normalized,
      code: 'INTERNAL_ERROR',
      category: 'internal',
      status: 500,
      publicMessage: '',
      retryable: false,
      reportable: false,
      fingerprint: 'control-flow',
      controlFlow: true,
      requestId: context.requestId,
    };
  }

  const appError = isAppErrorLike(error) ? error : undefined;
  const dependencyFailure = !appError && isDependencyFailure(error);
  const code =
    appError?.code ??
    (dependencyFailure ? 'DEPENDENCY_UNAVAILABLE' : 'INTERNAL_ERROR');
  const category =
    appError?.category ?? (dependencyFailure ? 'dependency' : 'internal');
  const reportable = appError?.reportable ?? true;
  const retryable = appError?.retryable ?? dependencyFailure;
  const publicMessage =
    appError?.message ??
    (dependencyFailure
      ? 'A required service is temporarily unavailable.'
      : 'Something went wrong. Please try again.');

  return {
    error: normalized,
    code,
    category,
    status: appError?.status ?? 500,
    publicMessage,
    retryable,
    reportable,
    fingerprint: fingerprint(
      [
        context.service,
        context.route ?? '',
        context.operation ?? '',
        code,
        normalized.name,
        normalizeFingerprintMessage(normalized.message),
      ].join(':'),
    ),
    controlFlow: false,
    requestId: context.requestId,
  };
}

export function toPublicError(classified: ClassifiedError): {
  code: ErrorCode;
  message: string;
  requestId?: string;
} {
  return {
    code: classified.code,
    message: classified.publicMessage,
    requestId: classified.requestId,
  };
}

export function createLoggerErrorReporter(logger: Logger): ErrorReporter {
  return {
    report: ({ error, context }) =>
      logger.error('Unhandled application error', error, context),
  };
}
