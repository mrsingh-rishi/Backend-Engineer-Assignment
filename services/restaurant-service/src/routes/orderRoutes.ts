import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { OrderService } from '../services/OrderService';
import { authenticateToken, requireRestaurant } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { getKafkaProducer } from '../config/kafka';

const router = Router();

// Initialize services and controllers
let orderController: OrderController;

// Lazy initialization to ensure database and kafka are ready
const getOrderController = () => {
  if (!orderController) {
    const db = getDatabase();
    const kafkaProducer = getKafkaProducer();
    const orderService = new OrderService(db, kafkaProducer);
    orderController = new OrderController(orderService);
  }
  return orderController;
};

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints
 */

// Order routes
router.get('/', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getOrderController().getOrders(req, res, next)
);

router.get('/pending', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getOrderController().getPendingOrders(req, res, next)
);

router.get('/stats', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getOrderController().getOrderStats(req, res, next)
);

router.get('/:id', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getOrderController().getOrder(req, res, next)
);

router.put('/:id/accept', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getOrderController().acceptOrder(req, res, next)
);

router.put('/:id/reject', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getOrderController().rejectOrder(req, res, next)
);

router.put('/:id/status', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getOrderController().updateOrderStatus(req, res, next)
);

router.put('/:id/preparing', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getOrderController().markOrderPreparing(req, res, next)
);

router.put('/:id/ready', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getOrderController().markOrderReady(req, res, next)
);

// PUT /api/orders/:id/status
router.put('/:id/status', authenticateToken, requireRestaurant, (req, res) => {
  res.json({
    success: true,
    message: 'Update order status endpoint - implementation in progress',
    data: {
      service: 'Restaurant Service',
      endpoint: `/orders/${req.params.id}/status`,
      status: 'under development'
    },
  });
});

export default router;
