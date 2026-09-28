import type { CampaignDeliveryPlan } from './delivery.js';
import { createCampaignRoutingManifest } from './vercel-routing.js';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const campaignRoutingManifestUrl = new URL(
  '../../../.astro/campaign-routing.json',
  import.meta.url,
);

export async function writeCampaignRoutingManifest(
  plan: CampaignDeliveryPlan,
): Promise<void> {
  const manifest = createCampaignRoutingManifest(plan);
  const manifestPath = fileURLToPath(campaignRoutingManifestUrl);
  const temporaryPath = `${manifestPath}.tmp`;
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(
    temporaryPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  await rename(temporaryPath, manifestPath);
}
