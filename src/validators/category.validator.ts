import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().optional(),
  image: z.string().url('Image must be a valid URL').optional().or(z.literal('')),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  image: z.string().url().optional().or(z.literal('')),
});

export const categoryIdParamSchema = z.object({
  id: z.string().min(1, 'Category ID or slug is required'),
});
