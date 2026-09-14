export const STORAGE_KEY = 'mini-workout-onboarding-banner-dismissed';

export const experienceLevels = [
  { value: 'BEGINNER', label: 'New to regular movement', title: 'Beginner' },
  {
    value: 'INTERMEDIATE',
    label: 'Building a steady rhythm',
    title: 'Intermediate',
  },
  { value: 'ADVANCED', label: 'Ready for a challenge', title: 'Advanced' },
] as const;

export const interestDescriptions: Record<string, string> = {
  cardio: 'Build your engine',
  flexibility: 'Make space to move',
  hiit: 'Short, focused effort',
  meditation: 'Find a quieter rhythm',
  mobility: 'Move with more ease',
  pilates: 'Strengthen with control',
  strength: 'Build everyday power',
  stretching: 'Unwind and reset',
  yoga: 'Breathe and flow',
};
