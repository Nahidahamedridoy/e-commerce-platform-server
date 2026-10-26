import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});
