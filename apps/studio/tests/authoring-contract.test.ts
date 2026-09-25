import {
  validateInternalHref,
  validateSlug,
} from '../schemaTypes/validation.js';
import { editorialDeskGroups, singletonDocumentTypes } from '../structure.js';
import { describe, expect, it } from 'vitest';

describe('Studio authoring contract', () => {
  it('organizes editorial types and explicit configuration singletons', () => {
    expect(editorialDeskGroups).toEqual([
      { title: 'Editorial', documentTypes: ['article', 'category'] },
      { title: 'People', documentTypes: ['author'] },
    ]);
    expect(singletonDocumentTypes).toEqual([
      'siteSettings',
      'primaryNavigation',
    ]);
  });

  it.each([
    ['mobility', true],
    [{ current: 'mobility' }, true],
    ['a-gentler-way-to-explore-mobility', true],
    [{ current: 42 }, false],
    ['Mobility', false],
    ['mobility--daily', false],
    ['../mobility', false],
    ['', false],
  ])('validates normalized slug %j', (value, expected) => {
    expect(validateSlug(value)).toBe(expected);
  });

  it.each([
    ['/', true],
    ['/#ways-to-move', true],
    ['/movement/mobility/', true],
    ['/movement#daily-range', true],
    ['/movement#42-range', false],
    ['/movement#daily#range', false],
    ['/movement?category=mobility', false],
    ['//example.com', false],
    ['/../admin', false],
    ['/movement\\mobility', false],
    ['https://example.com', false],
    [undefined, false],
  ])('validates safe internal href %j', (value, expected) => {
    expect(validateInternalHref(value)).toBe(expected);
  });
});
