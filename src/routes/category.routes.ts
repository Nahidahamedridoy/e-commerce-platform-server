import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from '../validators/category.validator';
import { Role } from '@prisma/client';

const router = Router();

// Public routes
router.get('/', CategoryController.getAll);
router.get(
  '/:id',
  validateRequest({ params: categoryIdParamSchema }),
  CategoryController.getById
);

// Admin protected routes
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ body: createCategorySchema }),
  CategoryController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ params: categoryIdParamSchema, body: updateCategorySchema }),
  CategoryController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ params: categoryIdParamSchema }),
  CategoryController.delete
);

export default router;
