import { Router } from 'express';
import { DeliveryAgentController } from '../controllers/DeliveryAgentController';
import { authenticateToken } from '../middleware/auth';

export function createAgentRoutes(deliveryAgentController: DeliveryAgentController): Router {
  const router = Router();

  // Apply auth middleware to all routes
  router.use(authenticateToken);

  // Profile routes
  router.get('/profile', (req, res) => deliveryAgentController.getProfile(req, res));
  router.put('/profile', (req, res) => deliveryAgentController.updateProfile(req, res));

  // Location routes
  router.put('/location', (req, res) => deliveryAgentController.updateLocation(req, res));

  // Availability routes
  router.put('/availability', (req, res) => deliveryAgentController.updateAvailability(req, res));

  // Active delivery
  router.get('/active-delivery', (req, res) => deliveryAgentController.getActiveDelivery(req, res));

  // Statistics
  router.get('/stats', (req, res) => deliveryAgentController.getStats(req, res));

  return router;
}
