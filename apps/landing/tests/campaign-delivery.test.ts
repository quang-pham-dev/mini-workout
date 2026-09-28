import type { CampaignViewModel } from '../src/features/campaigns/catalog.js';
import { planCampaignDelivery } from '../src/features/campaigns/delivery.js';
import {
  createVercelBuildOutputConfig,
  createVercelCampaignRoutes,
  parseCampaignRoutingManifest,
} from '../src/features/campaigns/vercel-routing.js';
import { describe, expect, it } from 'vitest';

function campaign(
  overrides: Partial<CampaignViewModel> = {},
): CampaignViewModel {
  return {
    campaignId: 'autumn-mobility-2026',
    slug: 'autumn-mobility',
    status: 'published',
    title: 'Autumn mobility',
    audienceDescription: 'Adults exploring everyday mobility.',
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: '2026-10-01T00:00:00.000Z',
    expiryPolicy: { mode: 'archive' },
    sections: [],
    seo: {
      title: 'Autumn mobility | Mini Workout',
      description: 'Explore approachable autumn mobility.',
      canonicalPath: '/campaigns/autumn-mobility/',
    },
    ...overrides,
  };
}

describe('Campaign static delivery planning', () => {
  it('omits scheduled campaigns and prerenders active campaigns', () => {
    const scheduled = campaign({
      campaignId: 'scheduled',
      slug: 'scheduled',
      startsAt: '2026-11-01T00:00:00.000Z',
      endsAt: '2026-12-01T00:00:00.000Z',
      seo: {
        title: 'Scheduled',
        description: 'Scheduled campaign.',
        canonicalPath: '/campaigns/scheduled/',
      },
    });

    const plan = planCampaignDelivery(
      [campaign(), scheduled],
      new Date('2026-09-15T00:00:00.000Z'),
    );

    expect(plan.pages).toEqual([
      expect.objectContaining({ lifecycle: 'active' }),
    ]);
    expect(plan.omittedScheduledSlugs).toEqual(['scheduled']);
  });

  it('retains an expired archive but removes its conversion state', () => {
    const plan = planCampaignDelivery(
      [campaign()],
      new Date('2026-10-01T00:00:00.000Z'),
    );

    expect(plan.pages).toEqual([
      expect.objectContaining({ lifecycle: 'archived' }),
    ]);
  });

  it('plans permanent internal redirects without silently rendering content', () => {
    const plan = planCampaignDelivery(
      [
        campaign({
          expiryPolicy: {
            mode: 'redirect',
            successor: { label: 'Continue', href: '/movement/mobility/' },
          },
        }),
      ],
      new Date('2026-10-01T00:00:00.000Z'),
    );

    expect(plan.pages).toEqual([]);
    expect(plan.redirects).toEqual([
      {
        source: '/campaigns/autumn-mobility/',
        destination: '/movement/mobility/',
        statusCode: 308,
      },
    ]);
  });

  it('plans an explicit 410 response', () => {
    const plan = planCampaignDelivery(
      [campaign({ expiryPolicy: { mode: 'gone' } })],
      new Date('2026-10-01T00:00:00.000Z'),
    );

    expect(plan.gone).toEqual([
      { path: '/campaigns/autumn-mobility/', statusCode: 410 },
    ]);
  });

  it('converts redirect and gone outcomes into ordered Vercel routes', () => {
    const routes = createVercelCampaignRoutes({
      version: 1,
      redirects: [
        {
          source: '/campaigns/autumn-mobility/',
          destination: '/movement/mobility/',
          statusCode: 308,
        },
      ],
      gone: [{ path: '/campaigns/finished/', statusCode: 410 }],
    });

    expect(routes).toEqual([
      {
        src: '^/campaigns/autumn-mobility/?$',
        headers: { Location: '/movement/mobility/' },
        status: 308,
      },
      { src: '^/campaigns/finished/?$', status: 410 },
    ]);
  });

  it('rejects malformed routing artifacts instead of emitting broad routes', () => {
    expect(() =>
      parseCampaignRoutingManifest({
        version: 1,
        redirects: [
          {
            source: '/campaigns/good/',
            destination: 'https://untrusted.example/path',
            statusCode: 308,
          },
        ],
        gone: [],
      }),
    ).toThrow('Campaign redirect destination must be an internal path.');

    expect(() =>
      parseCampaignRoutingManifest({
        version: 1,
        redirects: [
          {
            source: '/campaigns/good/',
            destination: '/movement/mobility/\nLocation: https://evil.example',
            statusCode: 308,
          },
        ],
        gone: [],
      }),
    ).toThrow('Campaign redirect destination must be an internal path.');

    expect(() =>
      parseCampaignRoutingManifest({
        version: 2,
        redirects: [],
        gone: [],
      }),
    ).toThrow('Unsupported Campaign routing manifest version.');
  });

  it('places campaign outcomes before normalization and filesystem routes', () => {
    const config = createVercelBuildOutputConfig({
      version: 1,
      redirects: [],
      gone: [{ path: '/campaigns/finished/', statusCode: 410 }],
    });

    expect(config.version).toBe(3);
    expect(config.routes[0]).toMatchObject({
      src: '^/.*$',
      continue: true,
    });
    expect(config.routes[1]).toEqual({
      src: '^/campaigns/finished/?$',
      status: 410,
    });
    expect(config.routes.at(-1)).toEqual({ handle: 'filesystem' });
  });
});
