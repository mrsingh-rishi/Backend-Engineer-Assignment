import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';
import { RestaurantOrderStatus } from '../models/types';
import { logger } from '../utils/logger';
import '../types/express';

class AppError extends Error {
  constructor(public override message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}

export class OrderController {
  constructor(private orderService: OrderService) {}

  async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = (req as any).user?.id;
      if (!restaurantId) {
        throw new AppError('Unauthorized', 401);
      }

      const {
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = req.query;

      const filters = {
        status: status as RestaurantOrderStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await this.orderService.getOrders(restaurantId, filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });

      logger.info(`Orders fetched for restaurant: ${restaurantId}`);
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrder(id);

      res.json({
        success: true,
        data: order,
      });

      logger.info(`Order fetched: ${id}`);
    } catch (error) {
      next(error);
    }
  }

  async getPendingOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = (req as any).user?.id;
      if (!restaurantId) {
        throw new AppError('Unauthorized', 401);
      }

      const orders = await this.orderService.getPendingOrders(restaurantId);

      res.json({
        success: true,
        data: orders,
      });

      logger.info(`Pending orders fetched for restaurant: ${restaurantId}`);
    } catch (error) {
      next(error);
    }
  }

  async acceptOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { estimatedDeliveryTime } = req.body;

      const deliveryTime = estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : undefined;
      const order = await this.orderService.acceptOrder(id, deliveryTime);

      res.json({
        success: true,
        message: 'Order accepted successfully',
        data: order,
      });

      logger.info(`Order accepted: ${id}`);
    } catch (error) {
      next(error);
    }
  }

  async rejectOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const order = await this.orderService.rejectOrder(id, reason);

      res.json({
        success: true,
        message: 'Order rejected successfully',
        data: order,
      });

      logger.info(`Order rejected: ${id}`);
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, estimatedDeliveryTime } = req.body;

      if (!status) {
        throw new AppError('Status is required', 400);
      }

      // Validate status
      const validStatuses: RestaurantOrderStatus[] = [
        'pending', 'confirmed', 'preparing', 'ready_for_pickup',
        'out_for_delivery', 'delivered', 'cancelled'
      ];

      if (!validStatuses.includes(status)) {
        throw new AppError('Invalid status', 400);
      }

      const deliveryTime = estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : undefined;
      const order = await this.orderService.updateOrderStatus(id, status, deliveryTime);

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: order,
      });

      logger.info(`Order status updated: ${id} - ${status}`);
    } catch (error) {
      next(error);
    }
  }

  async markOrderPreparing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.orderService.markOrderPreparing(id);

      res.json({
        success: true,
        message: 'Order marked as preparing',
        data: order,
      });

      logger.info(`Order marked as preparing: ${id}`);
    } catch (error) {
      next(error);
    }
  }

  async markOrderReady(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.orderService.markOrderReady(id);

      res.json({
        success: true,
        message: 'Order marked as ready for pickup',
        data: order,
      });

      logger.info(`Order marked as ready: ${id}`);
    } catch (error) {
      next(error);
    }
  }

  async getOrderStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = (req as any).user?.id;
      if (!restaurantId) {
        throw new AppError('Unauthorized', 401);
      }

      const { startDate, endDate } = req.query;

      const stats = await this.orderService.getOrderStats(
        restaurantId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: stats,
      });

      logger.info(`Order stats fetched for restaurant: ${restaurantId}`);
    } catch (error) {
      next(error);
    }
  }
}
