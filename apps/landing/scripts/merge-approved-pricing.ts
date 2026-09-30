import {
  PricingManifestMergeError,
  mergeApprovedPricing,
} from '../src/migration/merge-approved-pricing.js';
import { readFile } from 'node:fs/promises';

const [manifestPath, pricingPath, ...extra] = process.argv.slice(2);

if (!manifestPath || !pricingPath || extra.length > 0) {
  console.error('Pricing merge failed: INPUT_INVALID.');
  process.exitCode = 1;
} else {
  try {
    const [manifest, pricing] = await Promise.all([
      readFile(manifestPath, 'utf8').then(
        (value) => JSON.parse(value) as unknown,
      ),
      readFile(pricingPath, 'utf8').then(
        (value) => JSON.parse(value) as unknown,
      ),
    ]);
    const merged = mergeApprovedPricing(manifest, pricing);
    process.stdout.write(`${JSON.stringify(merged, null, 2)}\n`);
  } catch (error) {
    const code =
      error instanceof PricingManifestMergeError ? error.code : 'INPUT_INVALID';
    console.error(`Pricing merge failed: ${code}.`);
    process.exitCode = 1;
  }
}
