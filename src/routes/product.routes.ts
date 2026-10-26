import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
  productIdParamSchema,
} from '../validators/product.validator';
import { Role } from '@prisma/client';

const router = Router();

// Public routes
router.get(
  '/',
  validateRequest({ query: getProductsQuerySchema }),
  ProductController.getAll
);

router.get(
  '/:id',
  validateRequest({ params: productIdParamSchema }),
  ProductController.getById
);

// Admin protected routes
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ body: createProductSchema }),
  ProductController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ params: productIdParamSchema, body: updateProductSchema }),
  ProductController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ params: productIdParamSchema }),
  ProductController.delete
);

export default router;
