import {
  type LandingExperimentBrief,
  assessExperimentActivationReadiness,
  validateExperimentBriefRegistry,
} from '../src/experimentation/experiment-brief';
import type { LandingExperiment } from '../src/experimentation/experiment-registry';
import { describe, expect, it } from 'vitest';

const experiment: LandingExperiment = {
  schemaVersion: 1,
  id: 'home-cta-aa',
  version: 1,
  mode: 'aa',
  enabled: true,
  owner: 'growth-team',
  hypothesis: 'The instrumentation produces an unbiased split.',
  primaryMetric: 'register-click-rate',
  guardrailMetrics: ['content-start-rate'],
  stoppingRule: 'Run for 14 complete days and the approved minimum sample.',
  routeTemplates: ['/'],
  startsAt: '2026-10-01T00:00:00.000Z',
  endsAt: '2026-10-22T00:00:00.000Z',
  cleanupAt: '2026-10-29T00:00:00.000Z',
  variants: [
    { id: 'control-a', allocation: 5_000, experienceKey: 'home-cta-control' },
    { id: 'control-b', allocation: 5_000, experienceKey: 'home-cta-control' },
  ],
};

const brief: LandingExperimentBrief = {
  schemaVersion: 1,
  status: 'approved',
  experimentId: 'home-cta-aa',
  experimentVersion: 1,
  mode: 'aa',
  owner: 'growth-team',
  hypothesis: 'The instrumentation produces an unbiased split.',
  primaryMetric: {
    id: 'register-click-rate',
    role: 'primary',
    event: 'cta_clicked',
    outcome: { action: 'register', destinationApp: 'member' },
    direction: 'increase',
    statistic: 'unique-subject-conversion-rate',
    attributionWindowHours: 24,
  },
  guardrailMetrics: [
    {
      id: 'content-start-rate',
      role: 'guardrail',
      event: 'content_engaged',
      outcome: { engagement: 'started' },
      direction: 'no-decrease',
      statistic: 'unique-subject-conversion-rate',
      attributionWindowHours: 24,
    },
  ],
  minimumSamplePerVariant: 1_000,
  minimumRuntimeDays: 14,
  maximumRuntimeDays: 21,
  stoppingRule: 'Run for 14 complete days and the approved minimum sample.',
  approvals: { product: true, data: true, legal: true },
  reporting: {
    status: 'verified',
    reportKey: 'landing-home-cta-aa-v1',
    exposureEvent: 'experiment_exposure',
    joinKeys: ['anonymous_subject', 'experiment_version', 'variant_id'],
    assignmentUnit: 'consented-anonymous-subject',
    analysisUnit: 'subject',
    refreshCadence: 'daily',
  },
};

describe('Landing experiment brief and reporting contract', () => {
  it('accepts a bounded, approved brief with reportable metrics', () => {
    expect(validateExperimentBriefRegistry([brief])).toEqual([brief]);
  });

  it.each([
    { primaryMetric: { ...brief.primaryMetric, event: 'landing_page_view' } },
    {
      primaryMetric: {
        ...brief.primaryMetric,
        attributionWindowHours: 0,
      },
    },
    { minimumSamplePerVariant: 99 },
    { minimumRuntimeDays: 22 },
    { approvals: { product: true, data: true, legal: false } },
    {
      reporting: {
        ...brief.reporting,
        joinKeys: ['email', 'experiment_version', 'variant_id'],
      },
    },
    {
      reporting: {
        ...brief.reporting,
        reportKey: undefined,
      },
    },
  ])('rejects an unsafe approved brief: %j', (override) => {
    expect(() =>
      validateExperimentBriefRegistry([
        { ...brief, ...override } as LandingExperimentBrief,
      ]),
    ).toThrow('EXPERIMENT_BRIEF_REGISTRY_INVALID');
  });

  it('rejects duplicate experiment identities', () => {
    expect(() => validateExperimentBriefRegistry([brief, brief])).toThrow(
      'EXPERIMENT_BRIEF_REGISTRY_INVALID',
    );
  });

  it('reports a missing brief for an enabled experiment', () => {
    expect(
      assessExperimentActivationReadiness({
        experiments: [experiment],
        briefs: [],
      }),
    ).toEqual([
      {
        severity: 'error',
        code: 'experiment_brief_missing',
        path: 'experiments.home-cta-aa.v1',
      },
    ]);
  });

  it('separates approval and report-verification gates', () => {
    expect(
      assessExperimentActivationReadiness({
        experiments: [experiment],
        briefs: [
          {
            ...brief,
            status: 'draft',
            approvals: { product: true, data: false, legal: true },
            reporting: { ...brief.reporting, status: 'draft' },
          },
        ],
      }),
    ).toEqual([
      {
        severity: 'error',
        code: 'experiment_brief_not_approved',
        path: 'briefs.home-cta-aa.v1.approvals',
      },
      {
        severity: 'error',
        code: 'experiment_report_not_verified',
        path: 'briefs.home-cta-aa.v1.reporting',
      },
    ]);
  });

  it('fails closed when registry metadata drifts from the brief', () => {
    expect(
      assessExperimentActivationReadiness({
        experiments: [{ ...experiment, primaryMetric: 'different-metric' }],
        briefs: [brief],
      }),
    ).toEqual([
      {
        severity: 'error',
        code: 'experiment_brief_registry_mismatch',
        path: 'experiments.home-cta-aa.v1',
      },
    ]);
  });

  it('flags an approved orphan brief as stale', () => {
    expect(
      assessExperimentActivationReadiness({
        experiments: [],
        briefs: [brief],
      }),
    ).toEqual([
      {
        severity: 'error',
        code: 'experiment_definition_missing',
        path: 'briefs.home-cta-aa.v1',
      },
    ]);
  });

  it('passes only for a matching approved brief and verified report', () => {
    expect(
      assessExperimentActivationReadiness({
        experiments: [experiment],
        briefs: [brief],
      }),
    ).toEqual([]);
  });

  it('keeps empty production registries valid', () => {
    expect(
      assessExperimentActivationReadiness({ experiments: [], briefs: [] }),
    ).toEqual([]);
  });
});
