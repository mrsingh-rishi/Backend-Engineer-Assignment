import { Pool } from 'pg';
import { Restaurant, MenuItem } from '../models/types';

export class RestaurantRepository {
  constructor(private db: Pool) {}

  async findMany(params: {
    page: number;
    limit: number;
    cuisine?: string;
    search?: string;
    onlineOnly?: boolean;
  }): Promise<{ restaurants: Restaurant[]; total: number }> {
    const conditions = ['1=1'];
    const values: any[] = [];
    let paramCount = 1;

    if (params.onlineOnly) {
      conditions.push('is_online = true');
    }

    if (params.cuisine) {
      conditions.push(`cuisine_type ILIKE $${paramCount++}`);
      values.push(`%${params.cuisine}%`);
    }

    if (params.search) {
      conditions.push(`(name ILIKE $${paramCount++} OR address ILIKE $${paramCount++})`);
      values.push(`%${params.search}%`, `%${params.search}%`);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (params.page - 1) * params.limit;

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM restaurants WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get restaurants
    values.push(params.limit, offset);
    const result = await this.db.query(
      `SELECT * FROM restaurants 
       WHERE ${whereClause}
       ORDER BY rating DESC, name ASC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      values
    );

    const restaurants = result.rows.map(row => ({
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { restaurants, total };
  }

  async findById(id: string): Promise<Restaurant | null> {
    const result = await this.db.query(
      'SELECT * FROM restaurants WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    const result = await this.db.query(
      `SELECT * FROM menu_items 
       WHERE restaurant_id = $1 AND is_available = true
       ORDER BY category, name`,
      [restaurantId]
    );

    return result.rows.map(row => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      isAvailable: row.is_available,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findOnlineRestaurants(): Promise<Restaurant[]> {
    const currentTime = new Date().toTimeString().slice(0, 5);
    
    const result = await this.db.query(
      `SELECT * FROM restaurants 
       WHERE is_online = true 
       AND (
         opening_time IS NULL 
         OR closing_time IS NULL 
         OR (opening_time <= $1 AND closing_time >= $1)
       )
       ORDER BY rating DESC`,
      [currentTime]
    );

    return result.rows.map(row => ({
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
