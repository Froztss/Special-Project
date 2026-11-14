import { z } from 'zod';

export const ROLES = ['caregiver', 'ot', 'sped_teacher'] as const;

const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Invalid email address'));

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email,
  // bcrypt only uses the first 72 bytes, so cap input to avoid silent truncation.
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.enum(ROLES),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});