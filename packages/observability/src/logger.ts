export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LogValue[]
  | { [key: string]: LogValue };

export type LogContext = Record<string, LogValue>;

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export type LogSink = (event: LogEvent) => void;

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY = /password|secret|token|authorization|cookie|api[-_]?key/i;

export function redactContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redactValue(value),
    ]),
  );
}

function redactValue(value: LogValue): LogValue {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') {
    return redactContext(value);
  }
  return value;
}

function consoleSink(event: LogEvent): void {
  const output = JSON.stringify(event);
  if (event.level === 'error') console.error(output);
  else if (event.level === 'warn') console.warn(output);
  else console.log(output);
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
  child(context: LogContext): Logger;
}

export function createLogger(options: {
  service: string;
  context?: LogContext;
  sink?: LogSink;
}): Logger {
  const sink = options.sink ?? consoleSink;

  const write = (
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown,
  ) => {
    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      service: options.service,
      message,
      context: redactContext({ ...options.context, ...context }),
    };

    if (error) {
      const normalized =
        error instanceof Error ? error : new Error(String(error));
      event.error = {
        name: normalized.name,
        message: normalized.message,
        stack: normalized.stack,
      };
    }

    sink(event);
  };

  return {
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, error, context) => write('error', message, context, error),
    child: (context) =>
      createLogger({
        ...options,
        context: { ...options.context, ...context },
        sink,
      }),
  };
}
