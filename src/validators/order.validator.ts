import { z } from 'zod';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export const createOrderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
});

export const createOrderSchema = z.object({
  items: z.array(createOrderItemSchema).min(1, 'At least one item is required to place an order'),
  shippingAddress: z.string().min(5, 'Valid shipping address is required'),
  contactPhone: z.string().min(6, 'Valid contact phone number is required'),
  paymentMethod: z.string().default('CASH_ON_DELIVERY'),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
});

export const orderIdParamSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
});

export const getOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
