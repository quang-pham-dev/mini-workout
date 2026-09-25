export type JsonLd =
  | {
      '@context': 'https://schema.org';
      '@type': 'WebSite';
      name: string;
      url: string;
      description?: string;
    }
  | {
      '@context': 'https://schema.org';
      '@type': 'Article';
      headline: string;
      description?: string;
      image?: string | string[];
      datePublished?: string;
      dateModified?: string;
      author?: {
        '@type': 'Person' | 'Organization';
        name: string;
        url?: string;
      };
      mainEntityOfPage?: string;
    }
  | {
      '@context': 'https://schema.org';
      '@type': 'CollectionPage';
      name: string;
      description: string;
      url: string;
    }
  | {
      '@context': 'https://schema.org';
      '@type': 'BreadcrumbList';
      itemListElement: Array<{
        '@type': 'ListItem';
        position: number;
        name: string;
        item: string;
      }>;
    };

export function canonicalUrl(path: string, siteUrl: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || /[?#]/.test(path)) {
    throw new Error(
      'Canonical paths must be same-site paths without query or hash data.',
    );
  }

  const site = new URL(siteUrl);
  if (
    !['http:', 'https:'].includes(site.protocol) ||
    site.pathname !== '/' ||
    site.search ||
    site.hash
  ) {
    throw new Error('The landing site URL must be an HTTP(S) origin.');
  }

  const canonical = new URL(path, site);
  if (canonical.origin !== site.origin) {
    throw new Error('Canonical URLs must use the configured landing origin.');
  }

  return canonical.toString();
}

export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function sitemapXml(siteUrl: string, paths: readonly string[]): string {
  const locations = paths.map((path) => {
    const location = canonicalUrl(path, siteUrl).replace(/&/g, '&amp;');
    return `  <url><loc>${location}</loc></url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locations,
    '</urlset>',
    '',
  ].join('\n');
}
