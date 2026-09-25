import {
  type ContentContractIssue,
  mapInternalLink,
  mapLocalMedia,
  mapSeo,
  mapSlug,
} from '../src/content/validation-primitives.js';
import { describe, expect, it } from 'vitest';

function issues(): ContentContractIssue[] {
  return [];
}

describe('content validation primitives', () => {
  it('normalizes a valid slug and rejects reserved or unsafe segments', () => {
    const validIssues = issues();
    expect(
      mapSlug({ slug: '  everyday-mobility  ' }, 'slug', 'slug', validIssues),
    ).toBe('everyday-mobility');
    expect(validIssues).toEqual([]);

    for (const slug of ['Movement', '../preview', 'api']) {
      const invalidIssues = issues();
      mapSlug({ slug }, 'slug', 'slug', invalidIssues, {
        reserved: ['api'],
      });
      expect(invalidIssues).toContainEqual({ code: 'slug', path: 'slug' });
    }
  });

  it.each([
    '/',
    '/movement/mobility/',
    '/articles/a-gentler-way-to-explore-mobility/',
    '/#ways-to-move',
  ])('accepts the internal path %s', (href) => {
    const linkIssues = issues();
    expect(
      mapInternalLink({ label: 'Explore', href }, 'navigation', linkIssues),
    ).toEqual({ label: 'Explore', href });
    expect(linkIssues).toEqual([]);
  });

  it.each([
    'https://example.com/path',
    '//evil.example/path',
    'javascript:alert(1)',
    '/../preview',
    '/path?draft=true',
  ])('rejects the unsafe internal path %s', (href) => {
    const linkIssues = issues();
    mapInternalLink({ label: 'Explore', href }, 'navigation', linkIssues);
    expect(linkIssues).toContainEqual({
      code: 'internal_link_href',
      path: 'navigation.href',
    });
  });

  it('maps SEO and local media without accepting editor-defined canonicals', () => {
    const contentIssues = issues();
    expect(
      mapSeo(
        { title: 'Mobility | Mini Workout', description: 'Move with room.' },
        'seo',
        '/movement/mobility/',
        contentIssues,
      ),
    ).toEqual({
      title: 'Mobility | Mini Workout',
      description: 'Move with room.',
      canonicalPath: '/movement/mobility/',
    });
    expect(
      mapLocalMedia(
        {
          src: '/images/home/mobility-stretch.webp',
          alt: 'A person stretching at home.',
          width: 1122,
          height: 1402,
          caption: 'Move at your own pace.',
        },
        'image',
        contentIssues,
      ),
    ).toMatchObject({ width: 1122, height: 1402 });
    expect(contentIssues).toEqual([]);
  });

  it('accepts projected Sanity image CDN assets but rejects other remote hosts', () => {
    const sanityIssues = issues();
    expect(
      mapLocalMedia(
        {
          src: 'https://cdn.sanity.io/images/project123/production/asset-1200x800.webp',
          alt: 'A person moving at home.',
          width: 1200,
          height: 800,
          caption: 'Move with attention.',
        },
        'image',
        sanityIssues,
      ).src,
    ).toContain('cdn.sanity.io/images/');
    expect(sanityIssues).toEqual([]);

    const remoteIssues = issues();
    mapLocalMedia(
      {
        src: 'https://images.example.com/asset.webp',
        alt: 'Remote image.',
        width: 1200,
        height: 800,
        caption: 'Remote.',
      },
      'image',
      remoteIssues,
    );
    expect(remoteIssues).toContainEqual({
      code: 'media_src',
      path: 'image.src',
    });
  });
});
