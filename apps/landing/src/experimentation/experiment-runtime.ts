import {
  type ExperimentAssignment,
  type LandingExperiment,
  activeExperimentsForRoute,
  assignExperiment,
} from './experiment-registry';
import { captureProductEvent } from '@mini-workout/analytics/product-events';

type StorageBoundary = Readonly<{
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}>;
type CaptureClient = Readonly<{
  capture: (
    event: string,
    properties?: Readonly<Record<string, unknown>>,
  ) => void;
}>;

export type ExperimentTarget = Readonly<{
  experimentId: string;
  applyAssignment: (assignment: ExperimentAssignment) => void;
  observeOnce: (onVisible: () => void) => void;
}>;

export type LandingExperimentDependencies = Readonly<{
  enabled: boolean;
  preview: boolean;
  hasConsent: () => boolean;
  registry: readonly LandingExperiment[];
  routeTemplate: string;
  now: Date;
  storage: StorageBoundary;
  createSubjectId: () => string;
  targets: readonly ExperimentTarget[];
  forcedAssignment?: Readonly<{
    experimentId: string;
    variantId: string;
  }>;
  loadClient: () => Promise<CaptureClient>;
}>;

const subjectStorageKey = 'mini-workout:experiment-subject:v1';
const exposureStorageKey = 'mini-workout:experiment-exposures:v1';

function readSubjectId(dependencies: LandingExperimentDependencies): string {
  const stored = dependencies.storage.getItem(subjectStorageKey);
  if (stored && /^anon_[a-zA-Z0-9_-]{6,100}$/.test(stored)) return stored;
  const created = dependencies.createSubjectId();
  if (!/^anon_[a-zA-Z0-9_-]{6,100}$/.test(created)) {
    throw new Error('EXPERIMENT_SUBJECT_INVALID');
  }
  dependencies.storage.setItem(subjectStorageKey, created);
  return created;
}

function readExposureKeys(storage: StorageBoundary): Set<string> {
  const serialized = storage.getItem(exposureStorageKey);
  if (!serialized) return new Set();
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter(
        (value): value is string =>
          typeof value === 'string' && /^[a-z0-9.-]{1,160}$/.test(value),
      ),
    );
  } catch {
    return new Set();
  }
}

function assignmentFor(
  experiment: LandingExperiment,
  subjectId: string,
  preview: boolean,
  forcedAssignment: LandingExperimentDependencies['forcedAssignment'],
): ExperimentAssignment {
  const assigned = assignExperiment(experiment, subjectId);
  if (
    !preview ||
    forcedAssignment?.experimentId !== experiment.id ||
    !experiment.variants.some(({ id }) => id === forcedAssignment.variantId)
  ) {
    return assigned;
  }
  const variant = experiment.variants.find(
    ({ id }) => id === forcedAssignment.variantId,
  )!;
  return {
    experimentId: experiment.id,
    experimentVersion: experiment.version,
    variantId: variant.id,
    experienceKey: variant.experienceKey,
  };
}

export async function initializeLandingExperiments(
  dependencies: LandingExperimentDependencies,
): Promise<boolean> {
  if (!dependencies.enabled || !dependencies.hasConsent()) return false;

  try {
    const experiments = activeExperimentsForRoute(
      dependencies.registry,
      dependencies.routeTemplate,
      dependencies.now,
    );
    if (experiments.length === 0) return false;
    const eligibleTargets = dependencies.targets.filter((target) =>
      experiments.some(({ id }) => id === target.experimentId),
    );
    if (eligibleTargets.length === 0) return false;
    const subjectId = readSubjectId(dependencies);
    const exposed = readExposureKeys(dependencies.storage);
    let applied = false;

    for (const target of eligibleTargets) {
      const experiment = experiments.find(
        ({ id }) => id === target.experimentId,
      );
      if (!experiment) continue;
      const assignment = assignmentFor(
        experiment,
        subjectId,
        dependencies.preview,
        dependencies.forcedAssignment,
      );
      target.applyAssignment(assignment);
      applied = true;
      const exposureKey = `${experiment.id}.v${experiment.version}.${assignment.variantId}`;
      let observed = exposed.has(exposureKey);

      target.observeOnce(() => {
        if (observed) return;
        observed = true;
        exposed.add(exposureKey);
        try {
          dependencies.storage.setItem(
            exposureStorageKey,
            JSON.stringify([...exposed].slice(-100)),
          );
        } catch {
          // Exposure capture is best-effort and must not affect the CTA.
        }
        void dependencies
          .loadClient()
          .then((client) => {
            captureProductEvent(client, 'experiment_exposure', {
              route_template: dependencies.routeTemplate,
              experiment_id: `${experiment.id}.v${experiment.version}`,
              variant_id: assignment.variantId,
            });
          })
          .catch(() => undefined);
      });
    }
    return applied;
  } catch {
    return false;
  }
}
