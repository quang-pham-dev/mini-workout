import {
  createPublishReadyObservation,
  recordPublishReadySignal,
} from '../src/operations/publish-ready-signal';
import { evaluateLandingServiceLevels } from '../src/operations/service-level-policy';
import { describe, expect, it, vi } from 'vitest';

const evidence = {
  acceptedAt: '2026-09-29T12:00:00.000Z',
  completedAt: '2026-09-29T12:02:00.000Z',
  deploymentState: 'ready' as const,
  gates: {
    artifactBudget: 'passed' as const,
    contentContract: 'passed' as const,
    securityPolicy: 'passed' as const,
    staticBuild: 'passed' as const,
  },
};
const observedAt = new Date('2026-09-29T12:03:00.000Z');

describe('Landing publish-ready signal', () => {
  it('emits only the sanitized ready observation when every gate passes', () => {
    expect(createPublishReadyObservation({ evidence, observedAt })).toEqual({
      at: '2026-09-29T12:02:00.000Z',
      durationMs: 120_000,
      operation: 'publish.ready',
      outcome: 'ready',
    });
  });

  it.each([
    { deploymentState: 'failed' },
    { gates: { ...evidence.gates, contentContract: 'failed' } },
    { gates: { ...evidence.gates, securityPolicy: 'not_run' } },
  ])('fails closed for incomplete terminal evidence: %j', (override) => {
    expect(
      createPublishReadyObservation({
        evidence: { ...evidence, ...override } as typeof evidence,
        observedAt,
      }),
    ).toMatchObject({ operation: 'publish.ready', outcome: 'failed' });
  });

  it.each([
    { acceptedAt: 'invalid' },
    { completedAt: '2026-09-29T11:59:59.000Z' },
    { completedAt: '2026-09-30T12:00:00.001Z' },
    { completedAt: '2026-09-29T12:04:00.000Z' },
  ])('rejects unsafe lifecycle timestamps: %j', (override) => {
    expect(() =>
      createPublishReadyObservation({
        evidence: { ...evidence, ...override },
        observedAt,
      }),
    ).toThrow('PUBLISH_READY_SIGNAL_INVALID');
  });

  it('feeds the existing publish-to-ready service indicator', () => {
    const observation = createPublishReadyObservation({ evidence, observedAt });
    const report = evaluateLandingServiceLevels({
      now: observedAt,
      observations: Array.from({ length: 20 }, () => observation),
    });

    expect(report.indicators).toContainEqual({
      key: 'publish_to_ready',
      objective: 0.95,
      sampleCount: 20,
      status: 'pass',
      value: 1,
    });
  });

  it('keeps recording best-effort and strips all source evidence', () => {
    const record = vi.fn(() => {
      throw new Error('telemetry unavailable');
    });

    expect(() =>
      recordPublishReadySignal({ recorder: { record }, evidence, observedAt }),
    ).not.toThrow();
    expect(record).toHaveBeenCalledWith({
      at: '2026-09-29T12:02:00.000Z',
      durationMs: 120_000,
      operation: 'publish.ready',
      outcome: 'ready',
    });
  });
});
