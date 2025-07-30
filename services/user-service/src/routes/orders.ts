import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { 
  createOrderSchema, 
  getOrdersSchema, 
  getOrderSchema, 
  cancelOrderSchema 
} from '../schemas/validation';

const router = Router();
const orderController = new OrderController();

// All order routes require authentication
router.use(authenticate);

router.post('/', validate(createOrderSchema), orderController.createOrder);
router.get('/', validate(getOrdersSchema), orderController.getUserOrders);
router.get('/history', orderController.getOrderHistory);
router.get('/active', orderController.getActiveOrders);
router.get('/:id', validate(getOrderSchema), orderController.getOrderById);
router.put('/:id/cancel', validate(cancelOrderSchema), orderController.cancelOrder);

export default router;
