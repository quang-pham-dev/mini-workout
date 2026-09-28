import {
  type LandingExperiment,
  assignExperiment,
  validateExperimentRegistry,
} from '../src/experimentation/experiment-registry';
import { describe, expect, it } from 'vitest';

const aaExperiment: LandingExperiment = {
  schemaVersion: 1,
  id: 'home-cta-aa',
  version: 1,
  mode: 'aa',
  enabled: true,
  owner: 'growth-team',
  hypothesis: 'The instrumentation produces an unbiased split.',
  primaryMetric: 'register-click-rate',
  guardrailMetrics: ['page-load-error-rate'],
  stoppingRule: 'Run for 14 complete days and the approved minimum sample.',
  routeTemplates: ['/'],
  startsAt: '2026-09-20T00:00:00.000Z',
  endsAt: '2026-10-20T00:00:00.000Z',
  cleanupAt: '2026-10-27T00:00:00.000Z',
  variants: [
    { id: 'control-a', allocation: 5_000, experienceKey: 'home-cta-control' },
    { id: 'control-b', allocation: 5_000, experienceKey: 'home-cta-control' },
  ],
};

describe('Landing experiment registry', () => {
  it('accepts a bounded A/A definition and assigns deterministically', () => {
    const [experiment] = validateExperimentRegistry([aaExperiment]);
    const first = assignExperiment(experiment!, 'anon_018f-example');
    const second = assignExperiment(experiment!, 'anon_018f-example');

    expect(second).toEqual(first);
    expect(['control-a', 'control-b']).toContain(first.variantId);
    expect(first).toMatchObject({
      experimentId: 'home-cta-aa',
      experimentVersion: 1,
      experienceKey: 'home-cta-control',
    });
  });

  it('keeps a two-way A/A allocation within the readiness tolerance', () => {
    const experiment = validateExperimentRegistry([aaExperiment])[0]!;
    const counts = { 'control-a': 0, 'control-b': 0 };
    for (let index = 0; index < 10_000; index += 1) {
      const assignment = assignExperiment(experiment, `anon_subject_${index}`);
      counts[assignment.variantId as keyof typeof counts] += 1;
    }

    expect(counts['control-a']).toBeGreaterThan(4_500);
    expect(counts['control-a']).toBeLessThan(5_500);
    expect(counts['control-b']).toBe(10_000 - counts['control-a']);
  });

  it('rejects invalid allocations, duplicate IDs and divergent A/A experiences', () => {
    expect(() =>
      validateExperimentRegistry([
        {
          ...aaExperiment,
          variants: [
            ...aaExperiment.variants.slice(0, 1),
            {
              id: 'control-b',
              allocation: 4_999,
              experienceKey: 'other-experience',
            },
          ],
        },
      ]),
    ).toThrow('EXPERIMENT_REGISTRY_INVALID');

    expect(() =>
      validateExperimentRegistry([aaExperiment, aaExperiment]),
    ).toThrow('EXPERIMENT_REGISTRY_INVALID');
  });

  it('rejects unsafe routes and an invalid experiment lifecycle', () => {
    expect(() =>
      validateExperimentRegistry([
        {
          ...aaExperiment,
          routeTemplates: ['https://attacker.example/'],
          startsAt: '2026-02-30T00:00:00.000Z',
          endsAt: aaExperiment.startsAt,
          cleanupAt: '2026-09-01T00:00:00.000Z',
        },
      ]),
    ).toThrow('EXPERIMENT_REGISTRY_INVALID');
  });
});
