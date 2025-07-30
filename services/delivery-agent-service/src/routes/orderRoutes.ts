import { Router } from 'express';
import { DeliveryOrderController } from '../controllers/DeliveryOrderController';
import { authenticateToken } from '../middleware/auth';

export function createOrderRoutes(deliveryOrderController: DeliveryOrderController): Router {
  const router = Router();

  // Apply auth middleware to all routes
  router.use(authenticateToken);

  // Order management routes
  router.get('/:orderId', (req, res) => deliveryOrderController.getOrder(req, res));
  router.post('/:orderId/accept', (req, res) => deliveryOrderController.acceptOrder(req, res));
  router.post('/:orderId/reject', (req, res) => deliveryOrderController.rejectOrder(req, res));
  router.put('/:orderId/status', (req, res) => deliveryOrderController.updateOrderStatus(req, res));

  return router;
}
