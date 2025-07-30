import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';
import { OrderRepository } from '../repositories/OrderRepository';
import { RestaurantRepository } from '../repositories/RestaurantRepository';
import { getDatabase } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ApiError } from '../middlewares/errorHandler';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    const db = getDatabase();
    const orderRepository = new OrderRepository(db);
    const restaurantRepository = new RestaurantRepository(db);
    this.orderService = new OrderService(orderRepository, restaurantRepository);
  }

  /**
   * @swagger
   * /api/orders:
   *   post:
   *     summary: Place a new order
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - restaurantId
   *               - items
   *               - deliveryAddress
   *             properties:
   *               restaurantId:
   *                 type: string
   *                 format: uuid
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     menuItemId:
   *                       type: string
   *                       format: uuid
   *                     quantity:
   *                       type: integer
   *                       minimum: 1
   *               deliveryAddress:
   *                 type: string
   *                 minLength: 10
   *               specialInstructions:
   *                 type: string
   *     responses:
   *       201:
   *         description: Order placed successfully
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   */
  createOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { restaurantId, items, deliveryAddress, specialInstructions } = req.body;

      const order = await this.orderService.createOrder(userId, {
        restaurantId,
        items,
        deliveryAddress,
        specialInstructions,
      });

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: order,
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
   * /api/orders:
   *   get:
   *     summary: Get user's orders
   *     tags: [Orders]
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
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, accepted, rejected, preparing, ready, picked_up, delivered, cancelled]
   *     responses:
   *       200:
   *         description: List of user orders
   *       401:
   *         description: Unauthorized
   */
  getUserOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { page, limit, status } = req.query;

      const result = await this.orderService.getUserOrders(userId, {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        status: status as any,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/orders/{id}:
   *   get:
   *     summary: Get order details
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Order details
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Order not found
   */
  getOrderById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!id) {
        const error: ApiError = new Error('Order ID is required');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      const order = await this.orderService.getOrderById(id, userId);

      if (!order) {
        const error: ApiError = new Error('Order not found');
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/orders/{id}/cancel:
   *   put:
   *     summary: Cancel an order
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Order cancelled successfully
   *       400:
   *         description: Order cannot be cancelled
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Order not found
   */
  cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!id) {
        const error: ApiError = new Error('Order ID is required');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      const order = await this.orderService.cancelOrder(id, userId);

      if (!order) {
        const error: ApiError = new Error('Failed to cancel order');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: order,
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
   * /api/orders/history:
   *   get:
   *     summary: Get order history (delivered orders)
   *     tags: [Orders]
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
   *         description: Order history
   *       401:
   *         description: Unauthorized
   */
  getOrderHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { page, limit } = req.query;

      const result = await this.orderService.getOrderHistory(userId, {
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
   * /api/orders/active:
   *   get:
   *     summary: Get active orders (non-delivered orders)
   *     tags: [Orders]
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
   *         description: Active orders
   *       401:
   *         description: Unauthorized
   */
  getActiveOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { page, limit } = req.query;

      const result = await this.orderService.getActiveOrders(userId, {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
