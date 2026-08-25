import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const loginSchema = z.object({
  email,
  password,
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name must be at most 80 characters'),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
