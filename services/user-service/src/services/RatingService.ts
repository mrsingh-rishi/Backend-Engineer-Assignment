import { RatingRepository } from '../repositories/RatingRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { Rating, OrderStatus, PaginatedResponse } from '../models/types';
import { publishMessage } from '../config/kafka';
import { logger } from '../utils/logger';

export class RatingService {
  constructor(
    private ratingRepository: RatingRepository,
    private orderRepository: OrderRepository
  ) {}

  async createRating(
    userId: string,
    ratingData: {
      orderId: string;
      restaurantRating?: number;
      restaurantComment?: string;
      deliveryAgentRating?: number;
      deliveryAgentComment?: string;
    }
  ): Promise<{ restaurantRating?: Rating; deliveryAgentRating?: Rating }> {
    try {
      // Validate order exists and belongs to user
      const order = await this.orderRepository.findById(ratingData.orderId, userId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if order is delivered
      if (order.status !== OrderStatus.DELIVERED) {
        throw new Error('Can only rate delivered orders');
      }

      // Check if user has already rated this order
      const hasRated = await this.ratingRepository.hasUserRatedOrder(userId, ratingData.orderId);
      if (hasRated) {
        throw new Error('Order has already been rated');
      }

      const results: { restaurantRating?: Rating; deliveryAgentRating?: Rating } = {};

      // Create restaurant rating if provided
      if (ratingData.restaurantRating) {
        const restaurantRating = await this.ratingRepository.create({
          userId,
          orderId: ratingData.orderId,
          restaurantId: order.restaurantId,
          rating: ratingData.restaurantRating,
          ...(ratingData.restaurantComment && { comment: ratingData.restaurantComment }),
        });

        results.restaurantRating = restaurantRating;

        // Publish rating event for restaurant
        await publishMessage('rating-submitted', {
          ratingId: restaurantRating.id,
          userId,
          orderId: ratingData.orderId,
          restaurantId: order.restaurantId,
          rating: ratingData.restaurantRating,
          timestamp: new Date(),
        });
      }

      // Create delivery agent rating if provided
      if (ratingData.deliveryAgentRating && order.deliveryAgentId) {
        const deliveryAgentRating = await this.ratingRepository.create({
          userId,
          orderId: ratingData.orderId,
          deliveryAgentId: order.deliveryAgentId,
          rating: ratingData.deliveryAgentRating,
          ...(ratingData.deliveryAgentComment && { comment: ratingData.deliveryAgentComment }),
        });

        results.deliveryAgentRating = deliveryAgentRating;

        // Publish rating event for delivery agent
        await publishMessage('rating-submitted', {
          ratingId: deliveryAgentRating.id,
          userId,
          orderId: ratingData.orderId,
          deliveryAgentId: order.deliveryAgentId,
          rating: ratingData.deliveryAgentRating,
          timestamp: new Date(),
        });
      }

      logger.info(`Rating submitted for order: ${ratingData.orderId}`);

      return results;
    } catch (error) {
      logger.error('Error creating rating:', error);
      throw error;
    }
  }

  async getUserRatings(
    userId: string,
    params: { page: number; limit: number }
  ): Promise<PaginatedResponse<Rating>> {
    try {
      const { ratings, total } = await this.ratingRepository.findByUserId(userId, params);

      const totalPages = Math.ceil(total / params.limit);

      return {
        success: true,
        data: ratings,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error getting user ratings:', error);
      throw new Error('Failed to fetch user ratings');
    }
  }

  async getOrderRatings(orderId: string, userId: string): Promise<Rating[]> {
    try {
      // Validate that the order belongs to the user
      const order = await this.orderRepository.findById(orderId, userId);
      if (!order) {
        throw new Error('Order not found');
      }

      const ratings = await this.ratingRepository.findByOrderId(orderId);
      return ratings;
    } catch (error) {
      logger.error('Error getting order ratings:', error);
      throw new Error('Failed to fetch order ratings');
    }
  }

  async canUserRateOrder(userId: string, orderId: string): Promise<{
    canRate: boolean;
    reason?: string;
  }> {
    try {
      // Check if order exists and belongs to user
      const order = await this.orderRepository.findById(orderId, userId);
      if (!order) {
        return { canRate: false, reason: 'Order not found' };
      }

      // Check if order is delivered
      if (order.status !== OrderStatus.DELIVERED) {
        return { canRate: false, reason: 'Order must be delivered before rating' };
      }

      // Check if user has already rated this order
      const hasRated = await this.ratingRepository.hasUserRatedOrder(userId, orderId);
      if (hasRated) {
        return { canRate: false, reason: 'Order has already been rated' };
      }

      return { canRate: true };
    } catch (error) {
      logger.error('Error checking if user can rate order:', error);
      return { canRate: false, reason: 'Unable to verify rating eligibility' };
    }
  }
}
