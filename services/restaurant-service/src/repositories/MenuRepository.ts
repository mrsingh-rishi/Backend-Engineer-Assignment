import { Pool } from 'pg';
import { MenuItem, CreateMenuItemRequest, UpdateMenuItemRequest, PaginatedResponse } from '../models/types';

export class MenuRepository {
  constructor(private db: Pool) {}

  async findByRestaurantId(
    restaurantId: string,
    filters?: {
      category?: string;
      isAvailable?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<MenuItem>> {
    const { category, isAvailable, page = 1, limit = 20 } = filters || {};
    const offset = (page - 1) * limit;

    let whereClause = 'restaurant_id = $1';
    const params: any[] = [restaurantId];
    let paramCount = 1;

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (isAvailable !== undefined) {
      paramCount++;
      whereClause += ` AND is_available = $${paramCount}`;
      params.push(isAvailable);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM menu_items WHERE ${whereClause}`;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM menu_items 
      WHERE ${whereClause}
      ORDER BY category, name
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const result = await this.db.query(dataQuery, params);
    const menuItems = result.rows.map(row => this.mapRowToMenuItem(row));

    return {
      data: menuItems,
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

  async findById(id: string): Promise<MenuItem | null> {
    const result = await this.db.query(
      'SELECT * FROM menu_items WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMenuItem(result.rows[0]);
  }

  async create(restaurantId: string, data: CreateMenuItemRequest): Promise<MenuItem> {
    const result = await this.db.query(
      `INSERT INTO menu_items (
        restaurant_id, name, description, price, category, 
        is_available, image_url, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        restaurantId,
        data.name,
        data.description,
        data.price,
        data.category,
        data.isAvailable ?? true,
        data.imageUrl,
        new Date(),
        new Date(),
      ]
    );

    return this.mapRowToMenuItem(result.rows[0]);
  }

  async update(id: string, data: UpdateMenuItemRequest): Promise<MenuItem | null> {
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

    if (fields.length === 0) {
      const existingItem = await this.findById(id);
      return existingItem;
    }

    fields.push(`updated_at = $${paramCounter}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE menu_items 
      SET ${fields.join(', ')}
      WHERE id = $${paramCounter + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMenuItem(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM menu_items WHERE id = $1',
      [id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateAvailability(id: string, isAvailable: boolean): Promise<MenuItem | null> {
    const result = await this.db.query(
      `UPDATE menu_items 
       SET is_available = $1, updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [isAvailable, new Date(), id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMenuItem(result.rows[0]);
  }

  async getCategories(restaurantId: string): Promise<string[]> {
    const result = await this.db.query(
      `SELECT DISTINCT category FROM menu_items 
       WHERE restaurant_id = $1 AND category IS NOT NULL
       ORDER BY category`,
      [restaurantId]
    );

    return result.rows.map(row => row.category);
  }

  private mapRowToMenuItem(row: any): MenuItem {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      isAvailable: row.is_available,
      imageUrl: row.image_url,
      allergens: row.allergens ? JSON.parse(row.allergens) : undefined,
      nutritionalInfo: row.nutritional_info ? JSON.parse(row.nutritional_info) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
