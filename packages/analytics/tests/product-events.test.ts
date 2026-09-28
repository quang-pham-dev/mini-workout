import {
  captureProductEvent,
  sanitizeProductEvent,
} from '../src/product-events';
import { describe, expect, it, vi } from 'vitest';

describe('product analytics events', () => {
  it('forwards a valid landing page view', () => {
    const capture = vi.fn();

    const captured = captureProductEvent({ capture }, 'landing_page_view', {
      route_template: '/articles/:slug/',
      content_id: 'article-mobility-01',
      referrer_class: 'search',
      utm_source: 'google',
    });

    expect(captured).toBe(true);
    expect(capture).toHaveBeenCalledWith('landing_page_view', {
      route_template: '/articles/:slug/',
      content_id: 'article-mobility-01',
      referrer_class: 'search',
      utm_source: 'google',
    });
  });

  it('rejects unknown events and events missing required properties', () => {
    expect(sanitizeProductEvent('unknown_event', {})).toBeUndefined();
    expect(
      sanitizeProductEvent('cta_clicked', {
        route_template: '/',
        destination_app: 'member',
      }),
    ).toBeUndefined();
  });

  it('drops unsafe values, URLs, query strings, and unknown properties', () => {
    expect(
      sanitizeProductEvent('cta_clicked', {
        route_template: '/',
        cta_id: 'header-login',
        destination_app: 'member',
        action: 'login',
        placement: 'header',
        utm_campaign: 'https://example.test/?token=private',
        authorization: 'Bearer private',
        notes: 'free form data',
      }),
    ).toEqual({
      route_template: '/',
      cta_id: 'header-login',
      destination_app: 'member',
      action: 'login',
      placement: 'header',
    });
  });

  it('supports the bounded campaign, experiment, and engagement vocabulary', () => {
    expect(
      sanitizeProductEvent('campaign_view', {
        route_template: '/campaigns/:slug/',
        campaign_id: 'mobility-launch',
      }),
    ).toEqual({
      route_template: '/campaigns/:slug/',
      campaign_id: 'mobility-launch',
    });
    expect(
      sanitizeProductEvent('experiment_exposure', {
        route_template: '/',
        experiment_id: 'home-hero-01',
        variant_id: 'control',
      }),
    ).toBeDefined();
    expect(
      sanitizeProductEvent('content_engaged', {
        route_template: '/articles/:slug/',
        content_id: 'article-mobility-01',
        content_type: 'article',
        engagement: 'completed',
      }),
    ).toBeDefined();
  });
});
