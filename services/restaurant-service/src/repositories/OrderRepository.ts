import { Pool } from 'pg';
import { 
  RestaurantOrder, 
  RestaurantOrderStatus, 
  OrderItem,
  UpdateOrderStatusRequest,
  PaginatedResponse 
} from '../models/types';

export class OrderRepository {
  constructor(private db: Pool) {}

  async findByRestaurantId(
    restaurantId: string,
    filters?: {
      status?: RestaurantOrderStatus;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<RestaurantOrder>> {
    const { status, startDate, endDate, page = 1, limit = 20 } = filters || {};
    const offset = (page - 1) * limit;

    let whereClause = 'o.restaurant_id = $1';
    const params: any[] = [restaurantId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    if (startDate) {
      paramCount++;
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(endDate);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM orders o 
      WHERE ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data with order items
    const dataQuery = `
      SELECT 
        o.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        json_agg(
          json_build_object(
            'id', oi.id,
            'menuItemId', oi.menu_item_id,
            'name', mi.name,
            'price', oi.price,
            'quantity', oi.quantity,
            'specialInstructions', oi.special_instructions
          )
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE ${whereClause}
      GROUP BY o.id, u.name, u.email, u.phone
      ORDER BY o.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await this.db.query(dataQuery, params);
    const orders = result.rows.map(row => this.mapRowToOrder(row));

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string): Promise<RestaurantOrder | null> {
    const result = await this.db.query(
      `SELECT 
        o.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        json_agg(
          json_build_object(
            'id', oi.id,
            'menuItemId', oi.menu_item_id,
            'name', mi.name,
            'price', oi.price,
            'quantity', oi.quantity,
            'specialInstructions', oi.special_instructions
          )
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = $1
      GROUP BY o.id, u.name, u.email, u.phone`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOrder(result.rows[0]);
  }

  async updateStatus(
    id: string, 
    status: RestaurantOrderStatus,
    estimatedDeliveryTime?: Date
  ): Promise<RestaurantOrder | null> {
    const updateFields = ['status = $2', 'updated_at = $3'];
    const params: any[] = [id, status, new Date()];
    let paramCount = 3;

    if (estimatedDeliveryTime) {
      paramCount++;
      updateFields.push(`estimated_delivery_time = $${paramCount}`);
      params.push(estimatedDeliveryTime);
    }

    // Update status based timestamps
    if (status === 'confirmed') {
      paramCount++;
      updateFields.push(`confirmed_at = $${paramCount}`);
      params.push(new Date());
    } else if (status === 'preparing') {
      paramCount++;
      updateFields.push(`preparing_at = $${paramCount}`);
      params.push(new Date());
    } else if (status === 'ready_for_pickup') {
      paramCount++;
      updateFields.push(`ready_at = $${paramCount}`);
      params.push(new Date());
    } else if (status === 'out_for_delivery') {
      paramCount++;
      updateFields.push(`out_for_delivery_at = $${paramCount}`);
      params.push(new Date());
    } else if (status === 'delivered') {
      paramCount++;
      updateFields.push(`delivered_at = $${paramCount}`);
      params.push(new Date());
    }

    const query = `
      UPDATE orders 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    
    if (result.rows.length === 0) {
      return null;
    }

    // Get the updated order with all details
    return await this.findById(id);
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
    let whereClause = 'restaurant_id = $1';
    const params: any[] = [restaurantId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
    }

    // Get basic stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value
      FROM orders 
      WHERE ${whereClause}
    `;

    const statsResult = await this.db.query(statsQuery, params);
    const stats = statsResult.rows[0];

    // Get status breakdown
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM orders 
      WHERE ${whereClause}
      GROUP BY status
    `;

    const statusResult = await this.db.query(statusQuery, params);
    const statusBreakdown: Record<RestaurantOrderStatus, number> = {} as any;

    // Initialize all statuses with 0
    const allStatuses: RestaurantOrderStatus[] = [
      'pending', 'confirmed', 'preparing', 'ready_for_pickup',
      'out_for_delivery', 'delivered', 'cancelled'
    ];
    allStatuses.forEach(status => {
      statusBreakdown[status] = 0;
    });

    // Fill in actual counts
    statusResult.rows.forEach(row => {
      statusBreakdown[row.status as RestaurantOrderStatus] = parseInt(row.count, 10);
    });

    return {
      totalOrders: parseInt(stats.total_orders, 10),
      totalRevenue: parseFloat(stats.total_revenue),
      averageOrderValue: parseFloat(stats.average_order_value),
      statusBreakdown,
    };
  }

  async getPendingOrders(restaurantId: string): Promise<RestaurantOrder[]> {
    const result = await this.db.query(
      `SELECT 
        o.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        json_agg(
          json_build_object(
            'id', oi.id,
            'menuItemId', oi.menu_item_id,
            'name', mi.name,
            'price', oi.price,
            'quantity', oi.quantity,
            'specialInstructions', oi.special_instructions
          )
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.restaurant_id = $1 AND o.status = 'pending'
      GROUP BY o.id, u.name, u.email, u.phone
      ORDER BY o.created_at ASC`,
      [restaurantId]
    );

    return result.rows.map(row => this.mapRowToOrder(row));
  }

  private mapRowToOrder(row: any): RestaurantOrder {
    return {
      id: row.id,
      userId: row.user_id,
      restaurantId: row.restaurant_id,
      status: row.status,
      totalAmount: parseFloat(row.total_amount),
      deliveryFee: parseFloat(row.delivery_fee || '0'),
      tax: parseFloat(row.tax || '0'),
      deliveryAddress: JSON.parse(row.delivery_address),
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      estimatedDeliveryTime: row.estimated_delivery_time,
      specialInstructions: row.special_instructions,
      customer: {
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone,
      },
      items: row.items?.filter((item: any) => item.id !== null) || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      confirmedAt: row.confirmed_at,
      preparingAt: row.preparing_at,
      readyAt: row.ready_at,
      outForDeliveryAt: row.out_for_delivery_at,
      deliveredAt: row.delivered_at,
    };
  }
}
