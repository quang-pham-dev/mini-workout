import { createLandingServiceObservationRecorder } from '../src/operations/service-observation-recorder.js';
import type { Logger } from '@mini-workout/observability';
import { describe, expect, it, vi } from 'vitest';

describe('Landing service observation recorder', () => {
  it('writes only the stable observation contract at info level', () => {
    const logger = { info: vi.fn() } as unknown as Logger;
    const recorder = createLandingServiceObservationRecorder(logger);

    recorder.record({
      at: '2026-09-29T12:00:00.000Z',
      durationMs: 42,
      operation: 'publish.webhook',
      outcome: 'accepted',
    });

    expect(logger.info).toHaveBeenCalledWith('landing.service.observation', {
      at: '2026-09-29T12:00:00.000Z',
      durationMs: 42,
      operation: 'publish.webhook',
      outcome: 'accepted',
    });
  });

  it('keeps logger failures best-effort', () => {
    const logger = {
      info: vi.fn(() => {
        throw new Error('telemetry unavailable');
      }),
    } as unknown as Logger;
    const recorder = createLandingServiceObservationRecorder(logger);

    expect(() =>
      recorder.record({
        at: '2026-09-29T12:00:00.000Z',
        operation: 'preview.enable',
        outcome: 'success',
      }),
    ).not.toThrow();
  });
});
