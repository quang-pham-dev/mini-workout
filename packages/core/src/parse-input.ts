import { ValidationError } from './errors';
import { z } from 'zod';

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues);
  return parsed.data;
}
