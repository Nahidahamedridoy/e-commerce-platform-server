import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderIdParamSchema,
  getOrdersQuerySchema,
} from '../validators/order.validator';
import { Role } from '@prisma/client';

const router = Router();

// Customer / Admin order placement
router.post(
  '/',
  authenticate,
  validateRequest({ body: createOrderSchema }),
  OrderController.create
);

// Customer view personal orders
router.get(
  '/my-orders',
  authenticate,
  validateRequest({ query: getOrdersQuerySchema }),
  OrderController.getMyOrders
);

// Admin view all orders
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ query: getOrdersQuerySchema }),
  OrderController.getAllOrders
);

// View single order (owner or admin)
router.get(
  '/:id',
  authenticate,
  validateRequest({ params: orderIdParamSchema }),
  OrderController.getById
);

// Cancel order (owner or admin)
router.post(
  '/:id/cancel',
  authenticate,
  validateRequest({ params: orderIdParamSchema }),
  OrderController.cancelOrder
);

// Admin update order status
router.patch(
  '/:id/status',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({
    params: orderIdParamSchema,
    body: updateOrderStatusSchema,
  }),
  OrderController.updateStatus
);

export default router;
