import { formatDuration, getGreeting } from '@/features/workouts/presentation';
import { describe, expect, it } from 'vitest';

describe('workout presentation', () => {
  it('formats workout duration for cards', () => {
    expect(formatDuration(20)).toBe('20 min');
  });

  it.each([
    [8, 'Good morning'],
    [14, 'Good afternoon'],
    [20, 'Good evening'],
  ])('chooses a human greeting for hour %s', (hour, greeting) => {
    expect(getGreeting(hour)).toBe(greeting);
  });
});
