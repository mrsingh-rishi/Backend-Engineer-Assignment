import { Pool } from 'pg';
import { 
  DeliveryOrder, 
  DeliveryOrderStatus, 
  PaginatedResponse,
  DeliveryFilters 
} from '../models/types';

export class DeliveryOrderRepository {
  constructor(private db: Pool) {}

  async findById(id: string): Promise<DeliveryOrder | null> {
    const result = await this.db.query(
      `SELECT * FROM delivery_orders WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDeliveryOrder(result.rows[0]);
  }

  async findByDeliveryAgent(
    deliveryAgentId: string,
    filters?: DeliveryFilters
  ): Promise<PaginatedResponse<DeliveryOrder>> {
    const { status, startDate, endDate, page = 1, limit = 20 } = filters || {};
    const offset = (page - 1) * limit;

    let whereClause = 'delivery_agent_id = $1';
    const params: any[] = [deliveryAgentId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (startDate) {
      paramCount++;
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(new Date(startDate));
    }

    if (endDate) {
      paramCount++;
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(new Date(endDate));
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM delivery_orders WHERE ${whereClause}`;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM delivery_orders 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await this.db.query(dataQuery, params);
    const orders = result.rows.map((row: any) => this.mapRowToDeliveryOrder(row));

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

  async findActiveDelivery(deliveryAgentId: string): Promise<DeliveryOrder | null> {
    const activeStatuses = [
      'assigned', 'accepted', 'en_route_to_restaurant', 
      'arrived_at_restaurant', 'picked_up', 'en_route_to_customer', 'arrived_at_customer'
    ];

    const result = await this.db.query(
      `SELECT * FROM delivery_orders 
       WHERE delivery_agent_id = $1 AND status = ANY($2)
       ORDER BY assigned_at DESC
       LIMIT 1`,
      [deliveryAgentId, activeStatuses]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDeliveryOrder(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: DeliveryOrderStatus,
    notes?: string
  ): Promise<DeliveryOrder | null> {
    const updateFields = ['status = $2', 'updated_at = $3'];
    const params: any[] = [id, status, new Date()];
    let paramCount = 3;

    if (notes) {
      paramCount++;
      updateFields.push(`notes = $${paramCount}`);
      params.push(notes);
    }

    // Update status-based timestamps
    if (status === 'accepted') {
      paramCount++;
      updateFields.push(`accepted_at = $${paramCount}`);
      params.push(new Date());
    } else if (status === 'picked_up') {
      paramCount++;
      updateFields.push(`picked_up_at = $${paramCount}`);
      params.push(new Date());
    } else if (status === 'delivered') {
      paramCount++;
      updateFields.push(`delivered_at = $${paramCount}`);
      params.push(new Date());
    }

    const query = `
      UPDATE delivery_orders 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDeliveryOrder(result.rows[0]);
  }

  async assignToAgent(orderId: string, deliveryAgentId: string): Promise<DeliveryOrder | null> {
    const result = await this.db.query(
      `UPDATE delivery_orders 
       SET delivery_agent_id = $1, status = 'assigned', assigned_at = $2, updated_at = $3
       WHERE id = $4
       RETURNING *`,
      [deliveryAgentId, new Date(), new Date(), orderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDeliveryOrder(result.rows[0]);
  }

  async findUnassignedOrders(
    lat?: number,
    lng?: number,
    radiusKm?: number
  ): Promise<DeliveryOrder[]> {
    let query = `
      SELECT * FROM delivery_orders 
      WHERE delivery_agent_id IS NULL AND status = 'pending'
    `;
    const params: any[] = [];

    if (lat && lng && radiusKm) {
      query += `
        AND (6371 * acos(cos(radians($1)) * cos(radians((delivery_address->>'coordinates')::json->>'lat')::float) * 
             cos(radians(((delivery_address->>'coordinates')::json->>'lng')::float) - radians($2)) + 
             sin(radians($1)) * sin(radians(((delivery_address->>'coordinates')::json->>'lat')::float)))) < $3
      `;
      params.push(lat, lng, radiusKm);
    }

    query += ` ORDER BY created_at ASC LIMIT 50`;

    const result = await this.db.query(query, params);
    return result.rows.map((row: any) => this.mapRowToDeliveryOrder(row));
  }

  private mapRowToDeliveryOrder(row: any): DeliveryOrder {
    return {
      id: row.id,
      userId: row.user_id,
      restaurantId: row.restaurant_id,
      deliveryAgentId: row.delivery_agent_id,
      status: row.status,
      totalAmount: parseFloat(row.total_amount),
      deliveryFee: parseFloat(row.delivery_fee),
      deliveryAddress: JSON.parse(row.delivery_address),
      restaurantAddress: JSON.parse(row.restaurant_address),
      pickupTime: row.pickup_time,
      estimatedDeliveryTime: row.estimated_delivery_time,
      actualDeliveryTime: row.actual_delivery_time,
      distance: row.distance ? parseFloat(row.distance) : undefined,
      assignedAt: row.assigned_at,
      pickedUpAt: row.picked_up_at,
      deliveredAt: row.delivered_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
