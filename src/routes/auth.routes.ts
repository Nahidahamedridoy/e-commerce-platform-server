import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from '../validators/auth.validator';

const router = Router();

router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  AuthController.register
);

router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  AuthController.login
);

router.get('/me', authenticate, AuthController.getProfile);

router.patch(
  '/me',
  authenticate,
  validateRequest({ body: updateProfileSchema }),
  AuthController.updateProfile
);

export default router;
