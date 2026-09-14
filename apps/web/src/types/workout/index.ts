import { ExperienceLevel } from '@prisma/client';

export type WorkoutType = {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  level: ExperienceLevel;
  thumbnailUrl: string;
  coach: { name: string; bio: string };
  category: { name: string };
  _count: { likes: number };
  likes: { userId: string }[];
  favorites: { userId: string }[];
};
