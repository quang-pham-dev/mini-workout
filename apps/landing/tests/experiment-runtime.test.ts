import type { LandingExperiment } from '../src/experimentation/experiment-registry';
import {
  type ExperimentTarget,
  initializeLandingExperiments,
} from '../src/experimentation/experiment-runtime';
import { describe, expect, it, vi } from 'vitest';

const experiment: LandingExperiment = {
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

function createTarget(): ExperimentTarget & {
  reveal: () => void;
  applied: string[];
} {
  let onVisible: (() => void) | undefined;
  const applied: string[] = [];
  return {
    experimentId: experiment.id,
    applied,
    applyAssignment: (assignment) => applied.push(assignment.variantId),
    observeOnce: (listener) => {
      onVisible = listener;
    },
    reveal: () => onVisible?.(),
  };
}

describe('Landing experiment runtime', () => {
  it.each([
    ['kill switch', false, true],
    ['consent denied', true, false],
  ])('keeps the static control for %s', async (_case, enabled, consent) => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    const target = createTarget();
    const loadClient = vi.fn();

    const started = await initializeLandingExperiments({
      enabled,
      preview: false,
      hasConsent: () => consent,
      registry: [experiment],
      routeTemplate: '/',
      now: new Date('2026-09-27T00:00:00.000Z'),
      storage,
      createSubjectId: vi.fn(() => 'anon_subject'),
      targets: [target],
      loadClient,
    });

    expect(started).toBe(false);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(target.applied).toEqual([]);
    expect(loadClient).not.toHaveBeenCalled();
  });

  it('applies a sticky assignment and captures visible exposure once', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };
    const capture = vi.fn();
    const target = createTarget();
    const dependencies = {
      enabled: true,
      preview: false,
      hasConsent: () => true,
      registry: [experiment],
      routeTemplate: '/',
      now: new Date('2026-09-27T00:00:00.000Z'),
      storage,
      createSubjectId: vi.fn(() => 'anon_subject'),
      targets: [target],
      loadClient: async () => ({ capture }),
    } as const;

    expect(await initializeLandingExperiments(dependencies)).toBe(true);
    target.reveal();
    target.reveal();
    await Promise.resolve();

    expect(target.applied).toHaveLength(1);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('experiment_exposure', {
      route_template: '/',
      experiment_id: 'home-cta-aa.v1',
      variant_id: target.applied[0],
    });

    const secondTarget = createTarget();
    await initializeLandingExperiments({
      ...dependencies,
      targets: [secondTarget],
    });
    secondTarget.reveal();
    await Promise.resolve();
    expect(secondTarget.applied).toEqual(target.applied);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('does not create subject state when the page has no eligible target', async () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    expect(
      await initializeLandingExperiments({
        enabled: true,
        preview: false,
        hasConsent: () => true,
        registry: [experiment],
        routeTemplate: '/',
        now: new Date('2026-09-27T00:00:00.000Z'),
        storage,
        createSubjectId: () => 'anon_subject',
        targets: [],
        loadClient: async () => ({ capture: vi.fn() }),
      }),
    ).toBe(false);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('degrades to control when experiment storage is unavailable', async () => {
    const target = createTarget();
    expect(
      await initializeLandingExperiments({
        enabled: true,
        preview: false,
        hasConsent: () => true,
        registry: [experiment],
        routeTemplate: '/',
        now: new Date('2026-09-27T00:00:00.000Z'),
        storage: {
          getItem: () => {
            throw new Error('storage unavailable');
          },
          setItem: vi.fn(),
        },
        createSubjectId: () => 'anon_subject',
        targets: [target],
        loadClient: async () => ({ capture: vi.fn() }),
      }),
    ).toBe(false);
    expect(target.applied).toEqual([]);
  });

  it('allows an allowlisted forced variant only in preview mode', async () => {
    const run = async (preview: boolean) => {
      const target = createTarget();
      await initializeLandingExperiments({
        enabled: true,
        preview,
        hasConsent: () => true,
        registry: [experiment],
        routeTemplate: '/',
        now: new Date('2026-09-27T00:00:00.000Z'),
        storage: { getItem: () => 'anon_subject', setItem: vi.fn() },
        createSubjectId: () => 'unused',
        targets: [target],
        forcedAssignment: {
          experimentId: experiment.id,
          variantId: 'control-b',
        },
        loadClient: async () => ({ capture: vi.fn() }),
      });
      return target.applied[0];
    };

    expect(await run(true)).toBe('control-b');
    expect(await run(false)).toBeDefined();
  });
});
