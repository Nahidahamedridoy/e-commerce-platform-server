import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.coerce.number().positive('Price must be greater than zero'),
  stock: z.coerce.number().int().nonnegative('Stock cannot be negative').default(0),
  images: z.array(z.string().url('Each image must be a valid URL')).default([]),
  categoryId: z.string().min(1, 'Category ID is required'),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().min(10).optional(),
  price: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  images: z.array(z.string().url()).optional(),
  categoryId: z.string().min(1).optional(),
});

export const getProductsQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(['createdAt', 'price', 'name', 'stock']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const productIdParamSchema = z.object({
  id: z.string().min(1, 'Product ID or slug is required'),
});
