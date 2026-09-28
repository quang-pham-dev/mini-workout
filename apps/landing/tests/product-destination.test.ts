import {
  crossAppNavigationMetadata,
  linkBehavior,
  productDestination,
} from '../src/lib/product-destination.js';
import { describe, expect, it } from 'vitest';

describe('Landing product destinations', () => {
  it('derives auth routes from the environment-owned product origin', () => {
    expect(productDestination('https://members.example.com')).toEqual({
      signIn: 'https://members.example.com/login',
      register: 'https://members.example.com/register',
    });
  });

  it('keeps same-host navigation in the current tab', () => {
    expect(
      linkBehavior('/movement/mobility/', 'https://landing.example.com'),
    ).toEqual({ opensNewTab: false });
    expect(
      linkBehavior('http://localhost:3000/login', 'http://localhost:4321'),
    ).toEqual({ opensNewTab: false });
  });

  it('opens cross-host app navigation in a protected new tab', () => {
    expect(
      linkBehavior(
        'https://members.mini-workout.com/login',
        'https://landing.mini-workout.com',
      ),
    ).toEqual({
      opensNewTab: true,
      target: '_blank',
      rel: 'noopener',
    });
  });

  it('builds stable, non-PII metadata for future delegated tracking', () => {
    expect(
      crossAppNavigationMetadata({
        destinationApp: 'member',
        action: 'register',
        placement: 'home-hero',
      }),
    ).toEqual({
      'data-cross-app-navigation': 'true',
      'data-source-app': 'landing',
      'data-destination-app': 'member',
      'data-navigation-action': 'register',
      'data-navigation-placement': 'home-hero',
      'data-analytics-cta-id': 'home-hero-register',
    });
  });
});
