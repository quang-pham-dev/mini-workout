export const experimentAllocationTotal = 10_000;

export type ExperimentVariant = Readonly<{
  id: string;
  allocation: number;
  experienceKey: string;
}>;

export type LandingExperiment = Readonly<{
  schemaVersion: 1;
  id: string;
  version: number;
  mode: 'aa' | 'ab';
  enabled: boolean;
  owner: string;
  hypothesis: string;
  primaryMetric: string;
  guardrailMetrics: readonly string[];
  stoppingRule: string;
  routeTemplates: readonly string[];
  startsAt: string;
  endsAt: string;
  cleanupAt: string;
  variants: readonly ExperimentVariant[];
}>;

export type ExperimentAssignment = Readonly<{
  experimentId: string;
  experimentVersion: number;
  variantId: string;
  experienceKey: string;
}>;

const identifierPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const routeTemplates = new Set([
  '/',
  '/pricing/',
  '/articles/:slug/',
  '/movement/:slug/',
  '/campaigns/:slug/',
]);

function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0 && value.length <= 240;
}

function timestamp(value: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
    ? parsed
    : undefined;
}

function isValidExperiment(experiment: LandingExperiment): boolean {
  const startsAt = timestamp(experiment.startsAt);
  const endsAt = timestamp(experiment.endsAt);
  const cleanupAt = timestamp(experiment.cleanupAt);
  const variantIds = new Set(experiment.variants.map(({ id }) => id));
  const experienceKeys = new Set(
    experiment.variants.map(({ experienceKey }) => experienceKey),
  );

  return Boolean(
    experiment.schemaVersion === 1 &&
    identifierPattern.test(experiment.id) &&
    Number.isSafeInteger(experiment.version) &&
    experiment.version > 0 &&
    ['aa', 'ab'].includes(experiment.mode) &&
    typeof experiment.enabled === 'boolean' &&
    identifierPattern.test(experiment.owner) &&
    isNonEmptyText(experiment.hypothesis) &&
    identifierPattern.test(experiment.primaryMetric) &&
    experiment.guardrailMetrics.length > 0 &&
    experiment.guardrailMetrics.every((metric) =>
      identifierPattern.test(metric),
    ) &&
    isNonEmptyText(experiment.stoppingRule) &&
    experiment.routeTemplates.length > 0 &&
    experiment.routeTemplates.every((route) => routeTemplates.has(route)) &&
    startsAt !== undefined &&
    endsAt !== undefined &&
    cleanupAt !== undefined &&
    startsAt < endsAt &&
    endsAt <= cleanupAt &&
    experiment.variants.length >= 2 &&
    variantIds.size === experiment.variants.length &&
    experiment.variants.every(
      ({ id, allocation, experienceKey }) =>
        identifierPattern.test(id) &&
        Number.isSafeInteger(allocation) &&
        allocation > 0 &&
        identifierPattern.test(experienceKey),
    ) &&
    experiment.variants.reduce(
      (total, variant) => total + variant.allocation,
      0,
    ) === experimentAllocationTotal &&
    (experiment.mode !== 'aa' || experienceKeys.size === 1) &&
    (experiment.mode !== 'ab' || experienceKeys.size >= 2),
  );
}

export function validateExperimentRegistry(
  registry: readonly LandingExperiment[],
): readonly LandingExperiment[] {
  const identities = new Set(
    registry.map(({ id, version }) => `${id}.v${version}`),
  );
  if (
    identities.size !== registry.length ||
    registry.some((experiment) => !isValidExperiment(experiment))
  ) {
    throw new Error('EXPERIMENT_REGISTRY_INVALID');
  }
  return registry;
}

function allocationBucket(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % experimentAllocationTotal;
}

export function assignExperiment(
  experiment: LandingExperiment,
  subjectId: string,
): ExperimentAssignment {
  const bucket = allocationBucket(
    `${experiment.id}.v${experiment.version}:${subjectId}`,
  );
  let upperBound = 0;
  const variant =
    experiment.variants.find(({ allocation }) => {
      upperBound += allocation;
      return bucket < upperBound;
    }) ?? experiment.variants[experiment.variants.length - 1]!;

  return {
    experimentId: experiment.id,
    experimentVersion: experiment.version,
    variantId: variant.id,
    experienceKey: variant.experienceKey,
  };
}

export function activeExperimentsForRoute(
  registry: readonly LandingExperiment[],
  routeTemplate: string,
  now: Date,
): readonly LandingExperiment[] {
  const instant = now.getTime();
  return validateExperimentRegistry(registry).filter(
    (experiment) =>
      experiment.enabled &&
      experiment.routeTemplates.includes(routeTemplate) &&
      instant >= Date.parse(experiment.startsAt) &&
      instant < Date.parse(experiment.endsAt),
  );
}

// Deliberately empty until an approved A/A brief clears the activation gates.
export const landingExperimentRegistry = validateExperimentRegistry([]);
