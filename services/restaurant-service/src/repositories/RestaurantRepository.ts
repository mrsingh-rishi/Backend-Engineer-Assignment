import { Pool } from 'pg';
import { Restaurant, UpdateRestaurantProfileRequest } from '../models/types';

export class RestaurantRepository {
  constructor(private db: Pool) {}

  async findByEmail(email: string): Promise<Restaurant | null> {
    const result = await this.db.query(
      'SELECT * FROM restaurants WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRestaurant(result.rows[0]);
  }

  async findById(id: string): Promise<Restaurant | null> {
    const result = await this.db.query(
      'SELECT * FROM restaurants WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRestaurant(result.rows[0]);
  }

  async updateProfile(id: string, data: UpdateRestaurantProfileRequest): Promise<Restaurant> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${this.camelToSnake(key)} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    });

    fields.push(`updated_at = $${paramCounter}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE restaurants 
      SET ${fields.join(', ')}
      WHERE id = $${paramCounter + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToRestaurant(result.rows[0]);
  }

  async updateOnlineStatus(id: string, isOnline: boolean): Promise<Restaurant> {
    const result = await this.db.query(
      `UPDATE restaurants 
       SET is_online = $1, updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [isOnline, new Date(), id]
    );

    return this.mapRowToRestaurant(result.rows[0]);
  }

  async updateRating(id: string, newRating: number): Promise<void> {
    await this.db.query(
      `UPDATE restaurants 
       SET rating = $1, updated_at = $2
       WHERE id = $3`,
      [newRating, new Date(), id]
    );
  }

  async getRestaurantStats(id: string): Promise<{
    totalOrders: number;
    completedOrders: number;
    averageRating: number;
    totalRevenue: number;
  }> {
    const result = await this.db.query(
      `SELECT 
        COUNT(o.id) as total_orders,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as completed_orders,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as total_revenue
       FROM restaurants rest
       LEFT JOIN orders o ON rest.id = o.restaurant_id
       LEFT JOIN ratings r ON o.id = r.order_id
       WHERE rest.id = $1
       GROUP BY rest.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return {
        totalOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        totalRevenue: 0,
      };
    }

    const row = result.rows[0];
    return {
      totalOrders: parseInt(row.total_orders, 10),
      completedOrders: parseInt(row.completed_orders, 10),
      averageRating: parseFloat(row.average_rating),
      totalRevenue: parseFloat(row.total_revenue),
    };
  }

  private mapRowToRestaurant(row: any): Restaurant {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      cuisineType: row.cuisine_type,
      isOnline: row.is_online,
      rating: parseFloat(row.rating) || 0,
      openingTime: row.opening_time,
      closingTime: row.closing_time,
      imageUrl: row.image_url,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
