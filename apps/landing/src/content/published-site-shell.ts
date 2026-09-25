import type {
  SiteNavigationLink,
  SiteShellViewModel,
} from '../features/site-shell/catalog.js';
import {
  ContentContractError,
  type ContentContractIssue,
  type ContentMappingResult,
  isRecord,
  mapInternalLink,
  requiredString,
} from './validation-primitives.js';

interface SiteSettingsValue {
  brandName: string;
  footerTagline: string;
}

interface NavigationValue {
  primaryLinks: readonly SiteNavigationLink[];
  signInLabel: string;
  primaryCtaLabel: string;
}

function validateLifecycle(
  input: Record<string, unknown>,
  documentType: string,
  issues: ContentContractIssue[],
): void {
  if (input._type !== documentType) {
    issues.push({ code: 'document_type', path: '_type' });
  }
  if (input.schemaVersion !== 1) {
    issues.push({ code: 'schema_version', path: 'schemaVersion' });
  }
  if (input.status !== 'published') {
    issues.push({ code: 'status', path: 'status' });
  }
}

export function mapSiteSettingsDocument(
  input: unknown,
): ContentMappingResult<SiteSettingsValue> {
  const issues: ContentContractIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ code: 'document', path: '' }] };
  }
  validateLifecycle(input, 'siteSettings', issues);
  const value = {
    brandName: requiredString(input, 'brandName', 'brandName', issues),
    footerTagline: requiredString(
      input,
      'footerTagline',
      'footerTagline',
      issues,
    ),
  };
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value };
}

export function mapNavigationDocument(
  input: unknown,
): ContentMappingResult<NavigationValue> {
  const issues: ContentContractIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ code: 'document', path: '' }] };
  }
  validateLifecycle(input, 'primaryNavigation', issues);
  const links = Array.isArray(input.links)
    ? input.links.flatMap((link, index) => {
        if (!isRecord(link)) {
          issues.push({ code: 'navigation_link', path: `links.${index}` });
          return [];
        }
        const mapped = mapInternalLink(link, `links.${index}`, issues);
        return [
          {
            key: requiredString(link, '_key', `links.${index}._key`, issues),
            ...mapped,
          },
        ];
      })
    : [];
  if (!Array.isArray(input.links) || input.links.length === 0) {
    issues.push({ code: 'navigation_links', path: 'links' });
  }
  const keys = links.map(({ key }) => key);
  if (new Set(keys).size !== keys.length) {
    issues.push({ code: 'navigation_key', path: 'links' });
  }
  const value = {
    primaryLinks: links,
    signInLabel: requiredString(input, 'signInLabel', 'signInLabel', issues),
    primaryCtaLabel: requiredString(
      input,
      'primaryCtaLabel',
      'primaryCtaLabel',
      issues,
    ),
  };
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value };
}

function selectPublishedSingleton<T>(
  inputs: readonly unknown[],
  mapper: (input: unknown) => ContentMappingResult<T>,
): T {
  const published = inputs.filter(
    (input) => !(isRecord(input) && input.status === 'draft'),
  );
  if (published.length !== 1) {
    throw new ContentContractError(
      'SiteShell',
      [{ code: 'singleton_count', path: '' }],
      0,
    );
  }
  const result = mapper(published[0]);
  if (!result.ok) throw new ContentContractError('SiteShell', result.issues, 0);
  return result.value;
}

export function mapPublishedSiteShellDocuments(
  settingsInputs: readonly unknown[],
  navigationInputs: readonly unknown[],
): SiteShellViewModel {
  const settings = selectPublishedSingleton(
    settingsInputs,
    mapSiteSettingsDocument,
  );
  const navigation = selectPublishedSingleton(
    navigationInputs,
    mapNavigationDocument,
  );
  return { ...settings, ...navigation };
}
