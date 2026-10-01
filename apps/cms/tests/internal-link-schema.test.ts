import internalLink from '../src/components/shared/internal-link.json';
import { describe, expect, it } from 'vitest';

const hrefPattern = new RegExp(internalLink.attributes.href.regex);

describe('Strapi internal-link schema', () => {
  it('accepts internal paths with safe fragments', () => {
    expect(hrefPattern.test('/#ways-to-move')).toBe(true);
    expect(hrefPattern.test('/movement/mobility/#focuses')).toBe(true);
    expect(hrefPattern.test('/articles/gentle-mobility/')).toBe(true);
  });

  it('rejects external, traversing, queried, and unsafe fragment paths', () => {
    for (const href of [
      '//evil.example',
      '/../preview',
      '/movement?draft=true',
      '/#bad?query',
      '/#-invalid',
    ]) {
      expect(hrefPattern.test(href), href).toBe(false);
    }
  });
});
