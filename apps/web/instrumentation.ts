import { initObservability } from '@mini-workout/observability';

export function register() {
  initObservability({ service: 'web' });
}
