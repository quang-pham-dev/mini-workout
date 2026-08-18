import type { LogContext } from './logger';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  name: string;
  severity: AlertSeverity;
  message: string;
  context?: LogContext;
}

export interface AlertSink {
  send(alert: Alert): Promise<void>;
}
