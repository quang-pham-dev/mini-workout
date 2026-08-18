export type WebVitalName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';

export interface WebVitalMetric {
  name: WebVitalName;
  value: number;
  id: string;
  rating?: 'good' | 'needs-improvement' | 'poor';
  navigationType?: string;
}

export type WebVitalReporter = (metric: WebVitalMetric) => void;

export function createWebVitalReporter(
  sink: (metric: WebVitalMetric) => void,
): WebVitalReporter {
  return (metric) => sink(metric);
}
