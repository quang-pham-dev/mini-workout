import {
  mapPublishedSiteShellDocuments,
  mapSiteSettingsDocument,
} from '../src/content/published-site-shell.js';
import { describe, expect, it } from 'vitest';

const settings = {
  _type: 'siteSettings',
  schemaVersion: 1,
  status: 'published',
  brandName: 'Mini Workout',
  footerTagline: 'Small steps, built to last.',
};
const navigation = {
  _type: 'primaryNavigation',
  schemaVersion: 1,
  status: 'published',
  links: [
    { _key: 'ways', label: 'Ways to move', href: '/#ways-to-move' },
    { _key: 'how', label: 'How it works', href: '/#how-it-works' },
  ],
  signInLabel: 'Sign in',
  primaryCtaLabel: 'Build my routine',
};

const analyticsConsent = {
  heading: 'Your privacy, your choice',
  description: 'Allow anonymous usage data to help improve Mini Workout.',
  allowLabel: 'Allow analytics',
  declineLabel: 'Decline',
  manageLabel: 'Privacy choices',
  privacyLink: { label: 'Read our privacy policy', href: '/privacy/' },
};

describe('published site shell contract', () => {
  it('maps the two versioned singleton documents', () => {
    expect(mapPublishedSiteShellDocuments([settings], [navigation])).toEqual({
      brandName: 'Mini Workout',
      footerTagline: 'Small steps, built to last.',
      primaryLinks: [
        { key: 'ways', label: 'Ways to move', href: '/#ways-to-move' },
        { key: 'how', label: 'How it works', href: '/#how-it-works' },
      ],
      signInLabel: 'Sign in',
      primaryCtaLabel: 'Build my routine',
      analyticsConsent: null,
    });
  });

  it('maps complete approved consent copy without providing a fallback', () => {
    expect(
      mapPublishedSiteShellDocuments(
        [{ ...settings, analyticsConsent }],
        [navigation],
      ).analyticsConsent,
    ).toEqual(analyticsConsent);
  });

  it('rejects partial consent copy instead of publishing invented legal text', () => {
    expect(() =>
      mapPublishedSiteShellDocuments(
        [{ ...settings, analyticsConsent: { heading: 'Privacy' } }],
        [navigation],
      ),
    ).toThrow(/analyticsConsent\.description/);
  });

  it('rejects malformed published settings', () => {
    expect(mapSiteSettingsDocument({ ...settings, schemaVersion: 2 })).toEqual({
      ok: false,
      issues: [{ code: 'schema_version', path: 'schemaVersion' }],
    });
  });

  it('fails closed when a singleton is missing or duplicated', () => {
    expect(() => mapPublishedSiteShellDocuments([], [navigation])).toThrow(
      'Published SiteShell 0 violates the content contract: singleton_count',
    );
    expect(() =>
      mapPublishedSiteShellDocuments([settings], [navigation, navigation]),
    ).toThrow(
      'Published SiteShell 0 violates the content contract: singleton_count',
    );
  });

  it('rejects unsafe links and duplicate navigation keys', () => {
    expect(() =>
      mapPublishedSiteShellDocuments(
        [settings],
        [
          {
            ...navigation,
            links: [
              { _key: 'same', label: 'Unsafe', href: 'https://example.com' },
              { _key: 'same', label: 'Again', href: '/again' },
            ],
          },
        ],
      ),
    ).toThrow(/internal_link_href, navigation_key/);
  });
});
