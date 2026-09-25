import { mapPublishedSiteShellDocuments } from '../../content/published-site-shell.js';

export interface SiteNavigationLink {
  key: string;
  label: string;
  href: string;
}

export interface SiteShellViewModel {
  brandName: string;
  footerTagline: string;
  primaryLinks: readonly SiteNavigationLink[];
  signInLabel: string;
  primaryCtaLabel: string;
}

const settingsDocuments: readonly unknown[] = [
  {
    _type: 'siteSettings',
    schemaVersion: 1,
    status: 'published',
    brandName: 'Mini Workout',
    footerTagline: 'Small steps, built to last.',
  },
];

const navigationDocuments: readonly unknown[] = [
  {
    _type: 'primaryNavigation',
    schemaVersion: 1,
    status: 'published',
    links: [
      { _key: 'ways', label: 'Ways to move', href: '/#ways-to-move' },
      { _key: 'how', label: 'How it works', href: '/#how-it-works' },
    ],
    signInLabel: 'Sign in',
    primaryCtaLabel: 'Build my routine',
  },
];

const siteShell = mapPublishedSiteShellDocuments(
  settingsDocuments,
  navigationDocuments,
);

export function getPublishedSiteShell(): SiteShellViewModel {
  return siteShell;
}
