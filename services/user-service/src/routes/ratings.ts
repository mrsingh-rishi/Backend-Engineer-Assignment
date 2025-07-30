import { Router } from 'express';
import { RatingController } from '../controllers/RatingController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { createRatingSchema, getRatingsSchema } from '../schemas/validation';

const router = Router();
const ratingController = new RatingController();

// All rating routes require authentication
router.use(authenticate);

router.post('/', validate(createRatingSchema), ratingController.createRating);
router.get('/', validate(getRatingsSchema), ratingController.getUserRatings);
router.get('/order/:orderId', ratingController.getOrderRatings);
router.get('/can-rate/:orderId', ratingController.canUserRateOrder);

export default router;
