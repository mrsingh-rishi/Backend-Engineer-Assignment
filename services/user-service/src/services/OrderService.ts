import { OrderRepository } from '../repositories/OrderRepository';
import { RestaurantRepository } from '../repositories/RestaurantRepository';
import { Order, OrderStatus, PaginatedResponse } from '../models/types';
import { publishMessage } from '../config/kafka';
import { logger } from '../utils/logger';

export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private restaurantRepository: RestaurantRepository
  ) {}

  async createOrder(
    userId: string,
    orderData: {
      restaurantId: string;
      items: Array<{
        menuItemId: string;
        quantity: number;
      }>;
      deliveryAddress: string;
      specialInstructions?: string;
    }
  ): Promise<Order> {
    try {
      // Validate restaurant exists and is online
      const restaurant = await this.restaurantRepository.findById(orderData.restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      if (!restaurant.isOnline) {
        throw new Error('Restaurant is currently offline');
      }

      // Get menu items and calculate total
      const menuItems = await this.restaurantRepository.getMenuItems(orderData.restaurantId);
      const menuItemsMap = new Map(menuItems.map(item => [item.id, item]));

      let totalAmount = 0;
      const orderItems = [];

      for (const item of orderData.items) {
        const menuItem = menuItemsMap.get(item.menuItemId);
        if (!menuItem) {
          throw new Error(`Menu item ${item.menuItemId} not found`);
        }
        if (!menuItem.isAvailable) {
          throw new Error(`Menu item ${menuItem.name} is not available`);
        }

        const itemTotal = menuItem.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: menuItem.price,
        });
      }

      // Create order
      const order = await this.orderRepository.create({
        userId,
        restaurantId: orderData.restaurantId,
        items: orderItems,
        totalAmount,
        deliveryAddress: orderData.deliveryAddress,
        ...(orderData.specialInstructions && { specialInstructions: orderData.specialInstructions }),
      });

      // Publish order placed event
      await publishMessage('order-placed', {
        orderId: order.id,
        userId,
        restaurantId: orderData.restaurantId,
        totalAmount,
        items: orderItems,
        deliveryAddress: orderData.deliveryAddress,
        timestamp: new Date(),
      });

      logger.info(`Order created successfully: ${order.id}`);

      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  async getUserOrders(
    userId: string,
    params: {
      page: number;
      limit: number;
      status?: OrderStatus;
    }
  ): Promise<PaginatedResponse<Order>> {
    try {
      const { orders, total } = await this.orderRepository.findByUserId(userId, params);

      const totalPages = Math.ceil(total / params.limit);

      return {
        success: true,
        data: orders,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error getting user orders:', error);
      throw new Error('Failed to fetch user orders');
    }
  }

  async getOrderById(orderId: string, userId: string): Promise<Order | null> {
    try {
      const order = await this.orderRepository.findById(orderId, userId);
      return order;
    } catch (error) {
      logger.error('Error getting order:', error);
      throw new Error('Failed to fetch order');
    }
  }

  async cancelOrder(orderId: string, userId: string): Promise<Order | null> {
    try {
      // Get order first to validate user ownership and status
      const order = await this.orderRepository.findById(orderId, userId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if order can be cancelled
      if (![OrderStatus.PENDING, OrderStatus.ACCEPTED].includes(order.status)) {
        throw new Error('Order cannot be cancelled at this stage');
      }

      // Update order status
      const updatedOrder = await this.orderRepository.updateStatus(orderId, OrderStatus.CANCELLED);
      if (!updatedOrder) {
        throw new Error('Failed to cancel order');
      }

      // Publish order cancelled event
      await publishMessage('order-cancelled', {
        orderId,
        userId,
        restaurantId: order.restaurantId,
        timestamp: new Date(),
      });

      logger.info(`Order cancelled successfully: ${orderId}`);

      return updatedOrder;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  async getOrderHistory(
    userId: string,
    params: { page: number; limit: number }
  ): Promise<PaginatedResponse<Order>> {
    try {
      const { orders, total } = await this.orderRepository.findByUserId(userId, {
        ...params,
        status: OrderStatus.DELIVERED,
      });

      const totalPages = Math.ceil(total / params.limit);

      return {
        success: true,
        data: orders,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error getting order history:', error);
      throw new Error('Failed to fetch order history');
    }
  }

  async getActiveOrders(
    userId: string,
    params: { page: number; limit: number }
  ): Promise<PaginatedResponse<Order>> {
    try {
      // Get all non-delivered and non-cancelled orders
      const activeStatuses = [
        OrderStatus.PENDING,
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.PICKED_UP,
      ];

      const allActiveOrders = [];
      let totalCount = 0;

      // We need to get orders for each status and combine them
      for (const status of activeStatuses) {
        const { orders, total } = await this.orderRepository.findByUserId(userId, {
          page: 1,
          limit: 1000, // Get all for sorting
          status,
        });
        allActiveOrders.push(...orders);
        totalCount += total;
      }

      // Sort by creation date (most recent first)
      allActiveOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Apply pagination
      const startIndex = (params.page - 1) * params.limit;
      const endIndex = startIndex + params.limit;
      const paginatedOrders = allActiveOrders.slice(startIndex, endIndex);

      const totalPages = Math.ceil(totalCount / params.limit);

      return {
        success: true,
        data: paginatedOrders,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: totalCount,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error getting active orders:', error);
      throw new Error('Failed to fetch active orders');
    }
  }
}
