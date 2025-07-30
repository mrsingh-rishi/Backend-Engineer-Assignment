import { Router } from 'express';
import authRoutes from './authRoutes';
import restaurantRoutes from './restaurantRoutes';
import menuRoutes from './menuRoutes';
import orderRoutes from './orderRoutes';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/restaurant', restaurantRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);

// API Info endpoint
router.get('/', (req, res) => {
  res.json({
    service: 'Restaurant Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      restaurant: '/api/restaurant',
      menu: '/api/menu',
      orders: '/api/orders',
    },
    documentation: '/api-docs',
    health: '/health',
  });
});

export default router;
