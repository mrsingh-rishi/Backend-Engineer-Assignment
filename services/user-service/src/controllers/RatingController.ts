import { Request, Response, NextFunction } from 'express';
import { RatingService } from '../services/RatingService';
import { RatingRepository } from '../repositories/RatingRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { getDatabase } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ApiError } from '../middlewares/errorHandler';

export class RatingController {
  private ratingService: RatingService;

  constructor() {
    const db = getDatabase();
    const ratingRepository = new RatingRepository(db);
    const orderRepository = new OrderRepository(db);
    this.ratingService = new RatingService(ratingRepository, orderRepository);
  }

  /**
   * @swagger
   * /api/ratings:
   *   post:
   *     summary: Submit rating for order and/or delivery agent
   *     tags: [Ratings]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - orderId
   *             properties:
   *               orderId:
   *                 type: string
   *                 format: uuid
   *               restaurantRating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *               restaurantComment:
   *                 type: string
   *               deliveryAgentRating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *               deliveryAgentComment:
   *                 type: string
   *     responses:
   *       201:
   *         description: Rating submitted successfully
   *       400:
   *         description: Invalid input or order cannot be rated
   *       401:
   *         description: Unauthorized
   */
  createRating = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const {
        orderId,
        restaurantRating,
        restaurantComment,
        deliveryAgentRating,
        deliveryAgentComment,
      } = req.body;

      const result = await this.ratingService.createRating(userId, {
        orderId,
        restaurantRating,
        restaurantComment,
        deliveryAgentRating,
        deliveryAgentComment,
      });

      res.status(201).json({
        success: true,
        message: 'Rating submitted successfully',
        data: result,
      });
    } catch (error) {
      const apiError: ApiError = new Error((error as Error).message);
      apiError.statusCode = 400;
      apiError.isOperational = true;
      next(apiError);
    }
  };

  /**
   * @swagger
   * /api/ratings:
   *   get:
   *     summary: Get user's ratings
   *     tags: [Ratings]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *     responses:
   *       200:
   *         description: List of user ratings
   *       401:
   *         description: Unauthorized
   */
  getUserRatings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { page, limit } = req.query;

      const result = await this.ratingService.getUserRatings(userId, {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/ratings/order/{orderId}:
   *   get:
   *     summary: Get ratings for a specific order
   *     tags: [Ratings]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Order ratings
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Order not found
   */
  getOrderRatings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { orderId } = req.params;

      if (!orderId) {
        const error: ApiError = new Error('Order ID is required');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      const ratings = await this.ratingService.getOrderRatings(orderId, userId);

      res.json({
        success: true,
        data: ratings,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/ratings/can-rate/{orderId}:
   *   get:
   *     summary: Check if user can rate an order
   *     tags: [Ratings]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Rating eligibility status
   *       401:
   *         description: Unauthorized
   */
  canUserRateOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { orderId } = req.params;

      if (!orderId) {
        const error: ApiError = new Error('Order ID is required');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      const result = await this.ratingService.canUserRateOrder(userId, orderId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
