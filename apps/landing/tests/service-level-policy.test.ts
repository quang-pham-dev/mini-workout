import {
  type LandingServiceObservation,
  evaluateLandingServiceLevels,
} from '../src/operations/service-level-policy.js';
import { describe, expect, it } from 'vitest';

const now = new Date('2026-09-29T12:00:00.000Z');

function observations(
  operation: LandingServiceObservation['operation'],
  outcome: LandingServiceObservation['outcome'],
  count: number,
  at = '2026-09-29T11:58:00.000Z',
  durationMs?: number,
): LandingServiceObservation[] {
  return Array.from({ length: count }, () => ({
    at,
    operation,
    outcome,
    ...(durationMs === undefined ? {} : { durationMs }),
  }));
}

describe('Landing service-level policy', () => {
  it('excludes expected editor and duplicate outcomes from SLOs and incidents', () => {
    const report = evaluateLandingServiceLevels({
      now,
      observations: [
        ...observations('preview.enable', 'auth_rejected', 20),
        ...observations('publish.webhook', 'input_rejected', 20),
        ...observations('publish.webhook', 'duplicate', 20),
      ],
    });

    expect(report.indicators).toEqual([
      expect.objectContaining({
        key: 'preview_availability',
        status: 'insufficient_data',
      }),
      expect.objectContaining({
        key: 'publish_webhook_availability',
        status: 'insufficient_data',
      }),
      expect.objectContaining({
        key: 'publish_to_ready',
        status: 'insufficient_data',
      }),
    ]);
    expect(report.incidents).toEqual([]);
  });

  it('reports passing provisional indicators only with enough eligible samples', () => {
    const report = evaluateLandingServiceLevels({
      now,
      observations: [
        ...observations('preview.enable', 'success', 20),
        ...observations('publish.webhook', 'accepted', 20),
        ...observations('publish.ready', 'ready', 20, undefined, 120_000),
      ],
    });

    expect(report.indicators).toEqual([
      expect.objectContaining({
        key: 'preview_availability',
        status: 'pass',
        value: 1,
      }),
      expect.objectContaining({
        key: 'publish_webhook_availability',
        status: 'pass',
        value: 1,
      }),
      expect.objectContaining({
        key: 'publish_to_ready',
        status: 'pass',
        value: 1,
      }),
    ]);
  });

  it('creates an immediate configuration incident without exposing observation data', () => {
    const report = evaluateLandingServiceLevels({
      now,
      observations: observations('publish.webhook', 'configuration_failed', 1),
    });

    expect(report.incidents).toEqual([
      {
        code: 'landing_configuration_invalid',
        owner: 'landing-engineering',
        runbook: 'docs/observability/LANDING_SERVICE_LEVELS.md',
        severity: 'critical',
      },
    ]);
  });

  it('alerts only after actionable webhook failures breach two consecutive windows', () => {
    const oneWindow = observations(
      'publish.webhook',
      'dependency_failed',
      5,
      '2026-09-29T11:58:00.000Z',
    );
    expect(
      evaluateLandingServiceLevels({ now, observations: oneWindow }).incidents,
    ).toEqual([]);

    const twoWindows = [
      ...oneWindow,
      ...observations(
        'publish.webhook',
        'internal_failed',
        5,
        '2026-09-29T11:53:00.000Z',
      ),
    ];
    expect(
      evaluateLandingServiceLevels({ now, observations: twoWindows }).incidents,
    ).toContainEqual(
      expect.objectContaining({
        code: 'landing_publish_webhook_failures',
        severity: 'critical',
      }),
    );
  });

  it('warns after two consecutive publish-to-ready breaches', () => {
    const report = evaluateLandingServiceLevels({
      now,
      observations: [
        ...observations(
          'publish.ready',
          'ready',
          1,
          '2026-09-29T11:50:00.000Z',
          300_001,
        ),
        ...observations(
          'publish.ready',
          'failed',
          1,
          '2026-09-29T11:55:00.000Z',
        ),
      ],
    });

    expect(report.incidents).toContainEqual(
      expect.objectContaining({
        code: 'landing_publish_to_ready_slow',
        severity: 'warning',
      }),
    );
  });

  it.each([
    [{ at: 'invalid', operation: 'preview.enable', outcome: 'success' }],
    [
      {
        at: '2026-09-29T12:01:00.000Z',
        operation: 'preview.enable',
        outcome: 'success',
      },
    ],
    [
      {
        at: '2026-09-29T11:00:00.000Z',
        operation: 'publish.ready',
        outcome: 'ready',
        durationMs: -1,
      },
    ],
  ])('fails closed for invalid observations', (invalid) => {
    expect(() =>
      evaluateLandingServiceLevels({
        now,
        observations: [invalid as LandingServiceObservation],
      }),
    ).toThrow('Landing service observation is invalid.');
  });
});
