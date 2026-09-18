import {
  type LogContext,
  type LogSink,
  type Logger,
  createLogger,
} from './logger';

export interface Observability {
  readonly logger: Logger;
}

export interface ObservabilityOptions {
  service: string;
  context?: LogContext;
  sink?: LogSink;
}

type ObservabilityRegistry = Record<string, Observability>;

const globalForObservability = globalThis as typeof globalThis & {
  miniWorkoutObservability?: ObservabilityRegistry;
};

function getRegistry(): ObservabilityRegistry {
  return (globalForObservability.miniWorkoutObservability ??= Object.create(
    null,
  ) as ObservabilityRegistry);
}

export function initObservability(
  options: ObservabilityOptions,
): Observability {
  const registry = getRegistry();
  const existing = registry[options.service];
  if (existing) return existing;

  const instance: Observability = {
    logger: createLogger(options),
  };
  registry[options.service] = instance;
  return instance;
}

export function getObservability(service = 'web'): Observability {
  return initObservability({ service });
}
