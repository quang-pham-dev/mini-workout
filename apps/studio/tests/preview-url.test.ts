import { parsePreviewUrl } from '../preview-url.js';
import { describe, expect, it } from 'vitest';

describe('Studio preview URL', () => {
  it.each([
    [undefined, 'http://localhost:4321/'],
    ['', 'http://localhost:4321/'],
    ['  ', 'http://localhost:4321/'],
    [
      'landing-mini-workout.vercel.app',
      'https://landing-mini-workout.vercel.app/',
    ],
    ['https://preview.example.com/path', 'https://preview.example.com/path'],
  ])('normalizes %j to an absolute HTTP URL', (input, expected) => {
    expect(parsePreviewUrl(input).href).toBe(expected);
  });

  it.each(['javascript:alert(1)', 'ftp://preview.example.com', 'not a host'])(
    'rejects unsupported preview URL %j',
    (input) => {
      expect(() => parsePreviewUrl(input)).toThrow(/valid HTTP URL/);
    },
  );
});
