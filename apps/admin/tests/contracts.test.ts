import {
  adminCursorSearchSchema,
  toAdminCoachView,
  toAdminWorkoutView,
} from '@/features/admin/contracts';
import { safeInternalRedirect } from '@/lib/redirect';
import { securityHeaders } from '@/lib/security';
import { describe, expect, it } from 'vitest';

describe('admin boundary contracts', () => {
  it('normalizes cursor search and rejects empty cursors', () => {
    expect(adminCursorSearchSchema.parse({ cursor: 'item-1' })).toEqual({
      cursor: 'item-1',
    });
    expect(() => adminCursorSearchSchema.parse({ cursor: '' })).toThrow();
  });

  it('serializes workout dates for the browser', () => {
    const view = toAdminWorkoutView({
      id: 'workout-1',
      title: 'Core',
      slug: 'core',
      durationMinutes: 20,
      level: 'BEGINNER',
      isPublished: true,
      updatedAt: new Date('2026-09-15T00:00:00.000Z'),
      coach: { name: 'Coach' },
      category: { name: 'Strength' },
    });
    expect(view.updatedAt).toBe('2026-09-15T00:00:00.000Z');
  });

  it('serializes coach dates for the browser', () => {
    const view = toAdminCoachView({
      id: 'coach-1',
      name: 'Coach',
      slug: 'coach',
      bio: 'Bio',
      updatedAt: new Date('2026-09-15T00:00:00.000Z'),
      _count: { workouts: 2 },
    });
    expect(view.updatedAt).toBe('2026-09-15T00:00:00.000Z');
  });

  it('allows only same-origin relative return paths', () => {
    expect(safeInternalRedirect('/workouts?cursor=one')).toBe(
      '/workouts?cursor=one',
    );
    expect(safeInternalRedirect('https://attacker.example')).toBe('/workouts');
    expect(safeInternalRedirect('//attacker.example')).toBe('/workouts');
    expect(safeInternalRedirect(undefined)).toBe('/workouts');
    expect(safeInternalRedirect('/coaches#active')).toBe('/coaches#active');
    expect(safeInternalRedirect('/%')).toBe('/%');
  });

  it('sets anti-framing and MIME sniffing headers', () => {
    expect(securityHeaders['X-Frame-Options']).toBe('DENY');
    expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');
    // TanStack Start currently emits inline streaming/hydration scripts.
    expect(securityHeaders['Content-Security-Policy']).toContain(
      "script-src 'self' 'unsafe-inline'",
    );
  });
});
