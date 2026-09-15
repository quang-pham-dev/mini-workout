import type { AdminCoachRow } from '@mini-workout/core/coaches';
import type { AdminWorkoutRow } from '@mini-workout/core/workouts';
import { z } from 'zod';

export const adminCursorSearchSchema = z.object({
  cursor: z.string().trim().min(1).optional(),
});

export type AdminCursorSearch = z.infer<typeof adminCursorSearchSchema>;

export type AdminWorkoutView = Omit<AdminWorkoutRow, 'updatedAt'> & {
  updatedAt: string;
};

export type AdminCoachView = Omit<AdminCoachRow, 'updatedAt'> & {
  updatedAt: string;
};

export function toAdminWorkoutView(workout: AdminWorkoutRow): AdminWorkoutView {
  return { ...workout, updatedAt: workout.updatedAt.toISOString() };
}

export function toAdminCoachView(coach: AdminCoachRow): AdminCoachView {
  return { ...coach, updatedAt: coach.updatedAt.toISOString() };
}
