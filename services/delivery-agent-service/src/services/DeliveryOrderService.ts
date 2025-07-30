import { Pool } from 'pg';
import { Producer } from 'kafkajs';
import { 
  DeliveryOrder, 
  DeliveryOrderStatus, 
  UpdateDeliveryStatusRequest 
} from '../models/types';
import { DeliveryOrderRepository } from '../repositories/DeliveryOrderRepository';
import { DeliveryAgentRepository } from '../repositories/DeliveryAgentRepository';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { getDistance } from 'geolib';

class AppError extends Error {
  constructor(public override message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}

export class DeliveryOrderService {
  private orderRepository: DeliveryOrderRepository;
  private agentRepository: DeliveryAgentRepository;
  private redisClient = getRedisClient();
  private kafkaProducer: Producer;

  constructor(db: Pool, kafkaProducer: Producer) {
    this.orderRepository = new DeliveryOrderRepository(db);
    this.agentRepository = new DeliveryAgentRepository(db);
    this.kafkaProducer = kafkaProducer;
  }

  async getOrder(orderId: string): Promise<DeliveryOrder> {
    try {
      // Try cache first
      const cacheKey = `delivery_order:${orderId}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new AppError('Delivery order not found', 404);
      }

      // Cache for 2 minutes
      await this.redisClient.setex(cacheKey, 120, JSON.stringify(order));
      
      return order;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching delivery order:', error);
      throw new AppError('Failed to fetch delivery order', 500);
    }
  }

  async acceptOrder(orderId: string, agentId: string): Promise<DeliveryOrder> {
    try {
      // Check if agent is available and not on another delivery
      const agent = await this.agentRepository.findById(agentId);
      if (!agent) {
        throw new AppError('Delivery agent not found', 404);
      }

      if (!agent.isAvailable || agent.isOnDelivery) {
        throw new AppError('Agent is not available for delivery', 400);
      }

      // Get the order
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status !== 'assigned') {
        throw new AppError('Order is not available for acceptance', 400);
      }

      if (order.deliveryAgentId !== agentId) {
        throw new AppError('Order is not assigned to this agent', 403);
      }

      // Accept the order
      const updatedOrder = await this.orderRepository.updateStatus(orderId, 'accepted');
      if (!updatedOrder) {
        throw new AppError('Failed to accept order', 500);
      }

      // Update agent status
      await this.agentRepository.updateDeliveryStatus(agentId, true);

      // Clear caches
      await this.clearOrderCaches(orderId, agentId);

      // Publish order acceptance event
      await this.publishOrderStatusUpdate(updatedOrder);

      logger.info(`Order accepted: ${orderId} by agent: ${agentId}`);
      return updatedOrder;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error accepting order:', error);
      throw new AppError('Failed to accept order', 500);
    }
  }

  async rejectOrder(orderId: string, agentId: string, reason?: string): Promise<void> {
    try {
      // Get the order
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.deliveryAgentId !== agentId) {
        throw new AppError('Order is not assigned to this agent', 403);
      }

      if (order.status !== 'assigned') {
        throw new AppError('Order cannot be rejected at this stage', 400);
      }

      // Reject the order (set back to unassigned)
      await this.orderRepository.updateStatus(orderId, 'rejected');

      // Clear caches
      await this.clearOrderCaches(orderId, agentId);

      // Publish order rejection event for reassignment
      await this.publishOrderRejection(order, agentId, reason);

      logger.info(`Order rejected: ${orderId} by agent: ${agentId}, reason: ${reason}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error rejecting order:', error);
      throw new AppError('Failed to reject order', 500);
    }
  }

  async updateOrderStatus(
    orderId: string,
    agentId: string,
    data: UpdateDeliveryStatusRequest
  ): Promise<DeliveryOrder> {
    try {
      const { status, notes, proofOfDelivery } = data;

      // Get the order
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.deliveryAgentId !== agentId) {
        throw new AppError('Order is not assigned to this agent', 403);
      }

      // Validate status transition
      this.validateStatusTransition(order.status, status);

      // Update order status
      const updatedOrder = await this.orderRepository.updateStatus(orderId, status, notes);
      if (!updatedOrder) {
        throw new AppError('Failed to update order status', 500);
      }

      // Handle delivery completion
      if (status === 'delivered') {
        await this.handleDeliveryCompletion(agentId, updatedOrder);
      }

      // Clear caches
      await this.clearOrderCaches(orderId, agentId);

      // Publish status update event
      await this.publishOrderStatusUpdate(updatedOrder);

      logger.info(`Order status updated: ${orderId} - ${order.status} -> ${status}`);
      return updatedOrder;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating order status:', error);
      throw new AppError('Failed to update order status', 500);
    }
  }

  async findOptimalAgent(
    restaurantLat: number,
    restaurantLng: number,
    radiusKm: number = 10
  ): Promise<string | null> {
    try {
      const availableAgents = await this.agentRepository.findAvailableAgentsNearLocation(
        restaurantLat,
        restaurantLng,
        radiusKm
      );

      if (availableAgents.length === 0) {
        return null;
      }

      // Simple algorithm: pick closest agent with highest rating
      let bestAgent = availableAgents[0];
      let bestScore = this.calculateAgentScore(bestAgent, restaurantLat, restaurantLng);

      for (let i = 1; i < availableAgents.length; i++) {
        const agent = availableAgents[i];
        const score = this.calculateAgentScore(agent, restaurantLat, restaurantLng);
        
        if (score > bestScore) {
          bestScore = score;
          bestAgent = agent;
        }
      }

      return bestAgent.id;
    } catch (error) {
      logger.error('Error finding optimal agent:', error);
      return null;
    }
  }

  private calculateAgentScore(
    agent: any,
    restaurantLat: number,
    restaurantLng: number
  ): number {
    if (!agent.currentLat || !agent.currentLng) {
      return 0;
    }

    const distance = getDistance(
      { latitude: restaurantLat, longitude: restaurantLng },
      { latitude: agent.currentLat, longitude: agent.currentLng }
    );

    // Score based on distance (closer is better) and rating (higher is better)
    const distanceScore = Math.max(0, 10000 - distance) / 10000; // Normalize to 0-1
    const ratingScore = agent.rating / 5; // Normalize to 0-1

    return (distanceScore * 0.6) + (ratingScore * 0.4);
  }

  private validateStatusTransition(
    currentStatus: DeliveryOrderStatus,
    newStatus: DeliveryOrderStatus
  ): void {
    const validTransitions: Record<DeliveryOrderStatus, DeliveryOrderStatus[]> = {
      assigned: ['accepted', 'rejected'],
      accepted: ['en_route_to_restaurant', 'cancelled'],
      rejected: [], // Terminal state
      en_route_to_restaurant: ['arrived_at_restaurant', 'cancelled'],
      arrived_at_restaurant: ['picked_up', 'cancelled'],
      picked_up: ['en_route_to_customer', 'cancelled'],
      en_route_to_customer: ['arrived_at_customer', 'cancelled'],
      arrived_at_customer: ['delivered', 'cancelled'],
      delivered: [], // Terminal state
      cancelled: [], // Terminal state
    };

    const allowedNextStatuses = validTransitions[currentStatus] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400
      );
    }
  }

  private async handleDeliveryCompletion(agentId: string, order: DeliveryOrder): Promise<void> {
    try {
      // Mark agent as available
      await this.agentRepository.updateDeliveryStatus(agentId, false);

      // Update agent's total deliveries and earnings
      // This would typically be handled by a separate earnings service
      
      logger.info(`Delivery completed: ${order.id} by agent: ${agentId}`);
    } catch (error) {
      logger.error('Error handling delivery completion:', error);
      // Don't throw error as the main operation (status update) was successful
    }
  }

  private async publishOrderStatusUpdate(order: DeliveryOrder): Promise<void> {
    try {
      const event = {
        type: 'DELIVERY_STATUS_UPDATED',
        data: {
          orderId: order.id,
          agentId: order.deliveryAgentId,
          status: order.status,
          timestamp: new Date().toISOString(),
        },
      };

      await this.kafkaProducer.send({
        topic: 'delivery-events',
        messages: [
          {
            key: order.id,
            value: JSON.stringify(event),
          },
        ],
      });

      logger.info(`Published delivery status update event: ${order.id}`);
    } catch (error) {
      logger.error('Error publishing delivery status update:', error);
      // Don't throw error for event publishing failures
    }
  }

  private async publishOrderRejection(
    order: DeliveryOrder,
    agentId: string,
    reason?: string
  ): Promise<void> {
    try {
      const event = {
        type: 'DELIVERY_ORDER_REJECTED',
        data: {
          orderId: order.id,
          agentId,
          reason: reason || 'No reason provided',
          timestamp: new Date().toISOString(),
        },
      };

      await this.kafkaProducer.send({
        topic: 'delivery-events',
        messages: [
          {
            key: order.id,
            value: JSON.stringify(event),
          },
        ],
      });

      logger.info(`Published delivery rejection event: ${order.id}`);
    } catch (error) {
      logger.error('Error publishing delivery rejection:', error);
      // Don't throw error for event publishing failures
    }
  }

  private async clearOrderCaches(orderId: string, agentId: string): Promise<void> {
    try {
      const keys = [
        `delivery_order:${orderId}`,
        `active_delivery:${agentId}`,
        `agent:${agentId}`,
      ];
      
      // Clear delivery history cache keys for the agent
      const historyKeys = await this.redisClient.keys(`delivery_history:${agentId}:*`);
      keys.push(...historyKeys);
      
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      logger.warn('Error clearing order caches:', error);
      // Don't throw error for cache clearing failures
    }
  }
}
