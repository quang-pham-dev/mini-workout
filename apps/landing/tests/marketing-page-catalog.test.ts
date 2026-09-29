import {
  getPublishedMarketingPagePaths,
  getPublishedMarketingPages,
} from '../src/features/pages/catalog.js';
import { describe, expect, it } from 'vitest';

describe('marketing page catalog', () => {
  it('keeps legal routes absent until approved content is published', () => {
    expect(getPublishedMarketingPages()).toEqual([]);
    expect(getPublishedMarketingPagePaths()).toEqual([]);
  });
});
