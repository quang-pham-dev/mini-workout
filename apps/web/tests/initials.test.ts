import { getInitials } from '@/lib/auth/initials';
import { describe, expect, it } from 'vitest';

describe('getInitials helper', () => {
  it('extracts two letters from first and last name', () => {
    expect(getInitials('Kai Pham')).toBe('KP');
    expect(getInitials('Hoang Nam')).toBe('HN');
  });

  it('extracts two letters from multi-word names', () => {
    expect(getInitials('Nguyen Van An')).toBe('NA');
  });

  it('extracts two letters from single word name', () => {
    expect(getInitials('John')).toBe('JO');
    expect(getInitials('A')).toBe('A');
  });

  it('falls back to email initials if name is not provided', () => {
    expect(getInitials(null, 'kaipham.dev@gmail.com')).toBe('KA');
    expect(getInitials('', 'john@example.com')).toBe('JO');
  });

  it('falls back to default U if neither is provided', () => {
    expect(getInitials(null, null)).toBe('U');
    expect(getInitials('', '')).toBe('U');
  });
});
