import { Pool } from 'pg';
import { Rating } from '../models/types';

export class RatingRepository {
  constructor(private db: Pool) {}

  async create(ratingData: {
    userId: string;
    orderId: string;
    restaurantId?: string;
    deliveryAgentId?: string;
    rating: number;
    comment?: string;
  }): Promise<Rating> {
    const result = await this.db.query(
      `INSERT INTO ratings (user_id, order_id, restaurant_id, delivery_agent_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        ratingData.userId,
        ratingData.orderId,
        ratingData.restaurantId,
        ratingData.deliveryAgentId,
        ratingData.rating,
        ratingData.comment,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      orderId: row.order_id,
      restaurantId: row.restaurant_id,
      deliveryAgentId: row.delivery_agent_id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
    };
  }

  async findByUserId(
    userId: string,
    params: {
      page: number;
      limit: number;
    }
  ): Promise<{ ratings: Rating[]; total: number }> {
    const offset = (params.page - 1) * params.limit;

    // Get total count
    const countResult = await this.db.query(
      'SELECT COUNT(*) FROM ratings WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get ratings
    const result = await this.db.query(
      `SELECT r.*, 
              CASE WHEN r.restaurant_id IS NOT NULL THEN rest.name END as restaurant_name,
              CASE WHEN r.delivery_agent_id IS NOT NULL THEN da.name END as delivery_agent_name
       FROM ratings r
       LEFT JOIN restaurants rest ON r.restaurant_id = rest.id 
       LEFT JOIN delivery_agents da ON r.delivery_agent_id = da.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, params.limit, offset]
    );

    const ratings = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      orderId: row.order_id,
      restaurantId: row.restaurant_id,
      deliveryAgentId: row.delivery_agent_id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      restaurantName: row.restaurant_name,
      deliveryAgentName: row.delivery_agent_name,
    }));

    return { ratings, total };
  }

  async findByOrderId(orderId: string): Promise<Rating[]> {
    const result = await this.db.query(
      'SELECT * FROM ratings WHERE order_id = $1',
      [orderId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      orderId: row.order_id,
      restaurantId: row.restaurant_id,
      deliveryAgentId: row.delivery_agent_id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
    }));
  }

  async hasUserRatedOrder(userId: string, orderId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT COUNT(*) FROM ratings WHERE user_id = $1 AND order_id = $2',
      [userId, orderId]
    );

    return parseInt(result.rows[0].count, 10) > 0;
  }
}
