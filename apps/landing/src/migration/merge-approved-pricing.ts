import { mapPricingDocument } from '../content/published-pricing.js';
import {
  type LandingMigrationManifestV1,
  parseLandingMigrationManifestV1,
} from '@mini-workout/contracts';

export type PricingManifestMergeErrorCode =
  'INPUT_INVALID' | 'RESOURCE_CONFLICT';

export class PricingManifestMergeError extends Error {
  override readonly cause?: unknown;

  constructor(
    readonly code: PricingManifestMergeErrorCode,
    cause?: unknown,
  ) {
    super('Approved Pricing could not be merged into the migration manifest');
    this.name = 'PricingManifestMergeError';
    this.cause = cause;
  }
}

export function mergeApprovedPricing(
  manifestInput: unknown,
  pricingInput: unknown,
): LandingMigrationManifestV1 {
  let manifest: LandingMigrationManifestV1;
  try {
    manifest = parseLandingMigrationManifestV1(manifestInput);
  } catch (cause) {
    throw new PricingManifestMergeError('INPUT_INVALID', cause);
  }
  if (manifest.pricing !== null) {
    throw new PricingManifestMergeError('RESOURCE_CONFLICT');
  }

  const pricing = mapPricingDocument(pricingInput);
  if (!pricing.ok) {
    throw new PricingManifestMergeError('INPUT_INVALID');
  }

  try {
    return parseLandingMigrationManifestV1({
      ...manifest,
      pricing: pricingInput,
    });
  } catch (cause) {
    throw new PricingManifestMergeError('INPUT_INVALID', cause);
  }
}
