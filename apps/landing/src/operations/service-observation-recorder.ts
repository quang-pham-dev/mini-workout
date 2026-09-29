import type { LandingServiceObservation } from './service-level-policy.js';
import type { Logger } from '@mini-workout/observability';

export interface LandingServiceObservationRecorder {
  record(observation: LandingServiceObservation): void;
}

export function createLandingServiceObservationRecorder(
  logger: Pick<Logger, 'info'>,
): LandingServiceObservationRecorder {
  return {
    record: (observation) => {
      try {
        logger.info('landing.service.observation', { ...observation });
      } catch {
        // Operational telemetry must never replace the application response.
      }
    },
  };
}

export function recordLandingServiceObservation(
  recorder: LandingServiceObservationRecorder | undefined,
  observation: LandingServiceObservation,
): void {
  try {
    recorder?.record(observation);
  } catch {
    // Provider adapters remain best-effort even when a custom recorder throws.
  }
}
