import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'amar-dokan-server',
  });
});

// Mount module routes
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);

export default router;
