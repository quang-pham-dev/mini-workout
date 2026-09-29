import type { LandingServiceObservation } from './service-level-policy.js';
import {
  type LandingServiceObservationRecorder,
  recordLandingServiceObservation,
} from './service-observation-recorder.js';

type GateStatus = 'passed' | 'failed' | 'not_run';

export type PublishReadyEvidence = Readonly<{
  acceptedAt: string;
  completedAt: string;
  deploymentState: 'ready' | 'failed';
  gates: Readonly<{
    artifactBudget: GateStatus;
    contentContract: GateStatus;
    securityPolicy: GateStatus;
    staticBuild: GateStatus;
  }>;
}>;

const maximumDurationMs = 24 * 60 * 60 * 1_000;
const gateKeys = [
  'artifactBudget',
  'contentContract',
  'securityPolicy',
  'staticBuild',
] as const;

function timestamp(value: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
    ? parsed
    : undefined;
}

function invalidSignal(): never {
  throw new Error('PUBLISH_READY_SIGNAL_INVALID');
}

function validGates(gates: PublishReadyEvidence['gates']): boolean {
  const keys = Object.keys(gates).sort();
  return (
    keys.length === gateKeys.length &&
    [...gateKeys].sort().every((key, index) => key === keys[index]) &&
    gateKeys.every((key) =>
      ['passed', 'failed', 'not_run'].includes(gates[key]),
    )
  );
}

export function createPublishReadyObservation(
  input: Readonly<{
    evidence: PublishReadyEvidence;
    observedAt: Date;
  }>,
): LandingServiceObservation {
  const observedAt = input.observedAt.getTime();
  const acceptedAt = timestamp(input.evidence.acceptedAt);
  const completedAt = timestamp(input.evidence.completedAt);
  if (
    !Number.isFinite(observedAt) ||
    acceptedAt === undefined ||
    completedAt === undefined ||
    !['ready', 'failed'].includes(input.evidence.deploymentState) ||
    !validGates(input.evidence.gates) ||
    completedAt < acceptedAt ||
    completedAt > observedAt ||
    completedAt - acceptedAt > maximumDurationMs
  ) {
    invalidSignal();
  }

  const ready =
    input.evidence.deploymentState === 'ready' &&
    gateKeys.every((key) => input.evidence.gates[key] === 'passed');

  return {
    at: input.evidence.completedAt,
    durationMs: completedAt - acceptedAt,
    operation: 'publish.ready',
    outcome: ready ? 'ready' : 'failed',
  };
}

export function recordPublishReadySignal(
  input: Readonly<{
    recorder?: LandingServiceObservationRecorder;
    evidence: PublishReadyEvidence;
    observedAt: Date;
  }>,
): LandingServiceObservation {
  const observation = createPublishReadyObservation(input);
  recordLandingServiceObservation(input.recorder, observation);
  return observation;
}
