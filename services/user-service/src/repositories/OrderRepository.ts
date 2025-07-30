import { Pool } from 'pg';
import { Order, OrderItem, OrderStatus } from '../models/types';

export class OrderRepository {
  constructor(private db: Pool) {}

  async create(orderData: {
    userId: string;
    restaurantId: string;
    items: Array<{
      menuItemId: string;
      quantity: number;
      price: number;
    }>;
    totalAmount: number;
    deliveryAddress: string;
    specialInstructions?: string;
  }): Promise<Order> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, restaurant_id, total_amount, delivery_address, special_instructions)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          orderData.userId,
          orderData.restaurantId,
          orderData.totalAmount,
          orderData.deliveryAddress,
          orderData.specialInstructions,
        ]
      );

      const order = orderResult.rows[0];

      // Create order items
      const orderItems: OrderItem[] = [];
      for (const item of orderData.items) {
        const itemResult = await client.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, price)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [order.id, item.menuItemId, item.quantity, item.price]
        );

        orderItems.push({
          id: itemResult.rows[0].id,
          orderId: itemResult.rows[0].order_id,
          menuItemId: itemResult.rows[0].menu_item_id,
          quantity: itemResult.rows[0].quantity,
          price: parseFloat(itemResult.rows[0].price),
          createdAt: itemResult.rows[0].created_at,
        });
      }

      await client.query('COMMIT');

      return {
        id: order.id,
        userId: order.user_id,
        restaurantId: order.restaurant_id,
        deliveryAgentId: order.delivery_agent_id,
        status: order.status as OrderStatus,
        totalAmount: parseFloat(order.total_amount),
        deliveryAddress: order.delivery_address,
        specialInstructions: order.special_instructions,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: orderItems,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByUserId(
    userId: string,
    params: {
      page: number;
      limit: number;
      status?: OrderStatus;
    }
  ): Promise<{ orders: Order[]; total: number }> {
    const conditions = ['user_id = $1'];
    const values: any[] = [userId];
    let paramCount = 2;

    if (params.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(params.status);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (params.page - 1) * params.limit;

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM orders WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get orders with restaurant info
    values.push(params.limit, offset);
    const result = await this.db.query(
      `SELECT o.*, r.name as restaurant_name, r.address as restaurant_address
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      values
    );

    const orders = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      restaurantId: row.restaurant_id,
      deliveryAgentId: row.delivery_agent_id,
      status: row.status as OrderStatus,
      totalAmount: parseFloat(row.total_amount),
      deliveryAddress: row.delivery_address,
      specialInstructions: row.special_instructions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      restaurant: {
        id: row.restaurant_id,
        name: row.restaurant_name,
        address: row.restaurant_address,
      },
    }));

    return { orders, total };
  }

  async findById(orderId: string, userId?: string): Promise<Order | null> {
    const conditions = ['o.id = $1'];
    const values: any[] = [orderId];
    let paramCount = 2;

    if (userId) {
      conditions.push(`o.user_id = $${paramCount++}`);
      values.push(userId);
    }

    const whereClause = conditions.join(' AND ');

    const result = await this.db.query(
      `SELECT o.*, r.name as restaurant_name, r.address as restaurant_address,
              r.phone as restaurant_phone
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE ${whereClause}`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Get order items
    const itemsResult = await this.db.query(
      `SELECT oi.*, mi.name as menu_item_name, mi.description as menu_item_description
       FROM order_items oi
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    const items = itemsResult.rows.map(item => ({
      id: item.id,
      orderId: item.order_id,
      menuItemId: item.menu_item_id,
      quantity: item.quantity,
      price: parseFloat(item.price),
      createdAt: item.created_at,
      menuItem: {
        id: item.menu_item_id,
        name: item.menu_item_name,
        description: item.menu_item_description,
      },
    }));

    return {
      id: row.id,
      userId: row.user_id,
      restaurantId: row.restaurant_id,
      deliveryAgentId: row.delivery_agent_id,
      status: row.status as OrderStatus,
      totalAmount: parseFloat(row.total_amount),
      deliveryAddress: row.delivery_address,
      specialInstructions: row.special_instructions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items,
      restaurant: {
        id: row.restaurant_id,
        name: row.restaurant_name,
        address: row.restaurant_address,
        phone: row.restaurant_phone,
      },
    };
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
    const result = await this.db.query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      restaurantId: row.restaurant_id,
      deliveryAgentId: row.delivery_agent_id,
      status: row.status as OrderStatus,
      totalAmount: parseFloat(row.total_amount),
      deliveryAddress: row.delivery_address,
      specialInstructions: row.special_instructions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
