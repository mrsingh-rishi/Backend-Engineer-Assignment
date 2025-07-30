import { Router } from 'express';
import { RestaurantController } from '../controllers/RestaurantController';
import { validate } from '../middlewares/validation';
import { getRestaurantsSchema, getRestaurantSchema } from '../schemas/validation';

const router = Router();
const restaurantController = new RestaurantController();

// Public routes - no authentication required
router.get('/', validate(getRestaurantsSchema), restaurantController.getRestaurants);
router.get('/online', restaurantController.getOnlineRestaurants);
router.get('/search', restaurantController.searchRestaurants);
router.get('/:id', validate(getRestaurantSchema), restaurantController.getRestaurantById);
router.get('/:id/menu', validate(getRestaurantSchema), restaurantController.getRestaurantMenu);

export default router;
