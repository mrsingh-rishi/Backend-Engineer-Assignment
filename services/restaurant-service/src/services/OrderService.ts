import { Pool } from 'pg';
import { RestaurantOrder, RestaurantOrderStatus, PaginatedResponse } from '../models/types';
import { OrderRepository } from '../repositories/OrderRepository';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { Producer } from 'kafkajs';

class AppError extends Error {
  constructor(public override message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}

export class OrderService {
  private orderRepository: OrderRepository;
  private redisClient = getRedisClient();
  private kafkaProducer: Producer;

  constructor(db: Pool, kafkaProducer: Producer) {
    this.orderRepository = new OrderRepository(db);
    this.kafkaProducer = kafkaProducer;
  }

  async getOrders(
    restaurantId: string,
    filters?: {
      status?: RestaurantOrderStatus;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<RestaurantOrder>> {
    try {
      // Create cache key
      const cacheKey = `orders:${restaurantId}:${JSON.stringify(filters || {})}`;
      
      // Try to get from cache first (short cache for orders due to frequent updates)
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for orders: ${restaurantId}`);
        return JSON.parse(cached);
      }

      const result = await this.orderRepository.findByRestaurantId(restaurantId, filters);
      
      // Cache for 1 minute only (orders change frequently)
      await this.redisClient.setex(cacheKey, 60, JSON.stringify(result));
      
      return result;
    } catch (error) {
      logger.error('Error fetching orders:', error);
      throw new AppError('Failed to fetch orders', 500);
    }
  }

  async getOrder(id: string): Promise<RestaurantOrder> {
    try {
      // Try cache first
      const cacheKey = `order:${id}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const order = await this.orderRepository.findById(id);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Cache for 2 minutes
      await this.redisClient.setex(cacheKey, 120, JSON.stringify(order));
      
      return order;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching order:', error);
      throw new AppError('Failed to fetch order', 500);
    }
  }

  async updateOrderStatus(
    id: string,
    status: RestaurantOrderStatus,
    estimatedDeliveryTime?: Date
  ): Promise<RestaurantOrder> {
    try {
      // Get current order to validate restaurant ownership later
      const currentOrder = await this.orderRepository.findById(id);
      if (!currentOrder) {
        throw new AppError('Order not found', 404);
      }

      // Validate status transition
      this.validateStatusTransition(currentOrder.status, status);

      const updatedOrder = await this.orderRepository.updateStatus(id, status, estimatedDeliveryTime);
      if (!updatedOrder) {
        throw new AppError('Failed to update order status', 500);
      }

      // Clear caches
      await this.clearOrderCaches(updatedOrder.restaurantId, id);

      // Send Kafka event for status update
      await this.publishOrderStatusUpdate(updatedOrder);

      logger.info(`Order status updated: ${id} - ${currentOrder.status} -> ${status}`);
      return updatedOrder;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating order status:', error);
      throw new AppError('Failed to update order status', 500);
    }
  }

  async getPendingOrders(restaurantId: string): Promise<RestaurantOrder[]> {
    try {
      const cacheKey = `pending_orders:${restaurantId}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const orders = await this.orderRepository.getPendingOrders(restaurantId);
      
      // Cache for 30 seconds (very short for pending orders)
      await this.redisClient.setex(cacheKey, 30, JSON.stringify(orders));
      
      return orders;
    } catch (error) {
      logger.error('Error fetching pending orders:', error);
      throw new AppError('Failed to fetch pending orders', 500);
    }
  }

  async getOrderStats(
    restaurantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    statusBreakdown: Record<RestaurantOrderStatus, number>;
  }> {
    try {
      const cacheKey = `order_stats:${restaurantId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const stats = await this.orderRepository.getOrderStats(restaurantId, startDate, endDate);
      
      // Cache for 5 minutes
      await this.redisClient.setex(cacheKey, 300, JSON.stringify(stats));
      
      return stats;
    } catch (error) {
      logger.error('Error fetching order stats:', error);
      throw new AppError('Failed to fetch order stats', 500);
    }
  }

  async acceptOrder(id: string, estimatedDeliveryTime?: Date): Promise<RestaurantOrder> {
    return this.updateOrderStatus(id, 'confirmed', estimatedDeliveryTime);
  }

  async rejectOrder(id: string, reason?: string): Promise<RestaurantOrder> {
    try {
      const updatedOrder = await this.updateOrderStatus(id, 'cancelled');
      
      // Send rejection notification
      await this.publishOrderRejection(updatedOrder, reason);
      
      return updatedOrder;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error rejecting order:', error);
      throw new AppError('Failed to reject order', 500);
    }
  }

  async markOrderReady(id: string): Promise<RestaurantOrder> {
    return this.updateOrderStatus(id, 'ready_for_pickup');
  }

  async markOrderPreparing(id: string): Promise<RestaurantOrder> {
    return this.updateOrderStatus(id, 'preparing');
  }

  private validateStatusTransition(currentStatus: RestaurantOrderStatus, newStatus: RestaurantOrderStatus): void {
    const validTransitions: Record<RestaurantOrderStatus, RestaurantOrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready_for_pickup', 'cancelled'],
      ready_for_pickup: ['out_for_delivery', 'cancelled'],
      out_for_delivery: ['delivered'],
      delivered: [], // Final state
      cancelled: [], // Final state
    };

    const allowedNextStatuses = validTransitions[currentStatus] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400
      );
    }
  }

  private async publishOrderStatusUpdate(order: RestaurantOrder): Promise<void> {
    try {
      const event = {
        type: 'ORDER_STATUS_UPDATED',
        data: {
          orderId: order.id,
          restaurantId: order.restaurantId,
          userId: order.userId,
          status: order.status,
          estimatedDeliveryTime: order.estimatedDeliveryTime,
          timestamp: new Date().toISOString(),
        },
      };

      await this.kafkaProducer.send({
        topic: 'order-events',
        messages: [
          {
            key: order.id,
            value: JSON.stringify(event),
          },
        ],
      });

      logger.info(`Published order status update event: ${order.id}`);
    } catch (error) {
      logger.error('Error publishing order status update:', error);
      // Don't throw error for event publishing failures
    }
  }

  private async publishOrderRejection(order: RestaurantOrder, reason?: string): Promise<void> {
    try {
      const event = {
        type: 'ORDER_REJECTED',
        data: {
          orderId: order.id,
          restaurantId: order.restaurantId,
          userId: order.userId,
          reason: reason || 'Order rejected by restaurant',
          timestamp: new Date().toISOString(),
        },
      };

      await this.kafkaProducer.send({
        topic: 'order-events',
        messages: [
          {
            key: order.id,
            value: JSON.stringify(event),
          },
        ],
      });

      logger.info(`Published order rejection event: ${order.id}`);
    } catch (error) {
      logger.error('Error publishing order rejection:', error);
      // Don't throw error for event publishing failures
    }
  }

  private async clearOrderCaches(restaurantId: string, orderId?: string): Promise<void> {
    try {
      // Clear all order-related caches for this restaurant
      const keys = await this.redisClient.keys(`orders:${restaurantId}:*`);
      keys.push(`pending_orders:${restaurantId}`);
      keys.push(`order_stats:${restaurantId}:*`);
      
      if (orderId) {
        keys.push(`order:${orderId}`);
      }
      
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      logger.warn('Error clearing order caches:', error);
      // Don't throw error for cache clearing failures
    }
  }
}
