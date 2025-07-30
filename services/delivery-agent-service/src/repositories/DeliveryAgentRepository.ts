import { Pool } from 'pg';
import { DeliveryAgent, UpdateProfileRequest, LocationUpdate, PaginatedResponse } from '../models/types';

export class DeliveryAgentRepository {
  constructor(private db: Pool) {}

  async findById(id: string): Promise<DeliveryAgent | null> {
    const result = await this.db.query(
      `SELECT da.*, u.email, u.name, u.phone 
       FROM delivery_agents da
       JOIN users u ON da.user_id = u.id
       WHERE da.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDeliveryAgent(result.rows[0]);
  }

  async findByUserId(userId: string): Promise<DeliveryAgent | null> {
    const result = await this.db.query(
      `SELECT da.*, u.email, u.name, u.phone 
       FROM delivery_agents da
       JOIN users u ON da.user_id = u.id
       WHERE da.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDeliveryAgent(result.rows[0]);
  }

  async updateProfile(id: string, data: UpdateProfileRequest): Promise<DeliveryAgent | null> {
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
      return await this.findById(id);
    }

    fields.push(`updated_at = $${paramCounter}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE delivery_agents 
      SET ${fields.join(', ')}
      WHERE id = $${paramCounter + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return await this.findById(id);
  }

  async updateLocation(id: string, location: { lat: number; lng: number }): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE delivery_agents 
       SET current_lat = $1, current_lng = $2, updated_at = $3
       WHERE id = $4`,
      [location.lat, location.lng, new Date(), id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateAvailability(id: string, isAvailable: boolean): Promise<DeliveryAgent | null> {
    const result = await this.db.query(
      `UPDATE delivery_agents 
       SET is_available = $1, updated_at = $2
       WHERE id = $3`,
      [isAvailable, new Date(), id]
    );

    if (result.rowCount === null || result.rowCount === 0) {
      return null;
    }

    return await this.findById(id);
  }

  async updateDeliveryStatus(id: string, isOnDelivery: boolean): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE delivery_agents 
       SET is_on_delivery = $1, updated_at = $2
       WHERE id = $3`,
      [isOnDelivery, new Date(), id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async findAvailableAgentsNearLocation(
    lat: number,
    lng: number,
    radiusKm: number,
    limit: number = 10
  ): Promise<DeliveryAgent[]> {
    // Using Haversine formula to find agents within radius
    const result = await this.db.query(
      `SELECT da.*, u.email, u.name, u.phone,
       (6371 * acos(cos(radians($1)) * cos(radians(current_lat)) * 
        cos(radians(current_lng) - radians($2)) + 
        sin(radians($1)) * sin(radians(current_lat)))) AS distance
       FROM delivery_agents da
       JOIN users u ON da.user_id = u.id
       WHERE da.is_active = true 
         AND da.is_available = true 
         AND da.is_on_delivery = false
         AND da.current_lat IS NOT NULL 
         AND da.current_lng IS NOT NULL
       HAVING distance < $3
       ORDER BY distance ASC
       LIMIT $4`,
      [lat, lng, radiusKm, limit]
    );

    return result.rows.map(row => this.mapRowToDeliveryAgent(row));
  }

  async getAgentStats(id: string, startDate?: Date, endDate?: Date): Promise<{
    totalDeliveries: number;
    completedDeliveries: number;
    totalEarnings: number;
    averageRating: number;
    averageDeliveryTime: number;
  }> {
    let whereClause = 'delivery_agent_id = $1';
    const params: any[] = [id];
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

    const statsQuery = `
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
        COALESCE(SUM(delivery_fee), 0) as total_earnings,
        COALESCE(AVG(CASE WHEN rating > 0 THEN rating END), 0) as average_rating,
        COALESCE(AVG(EXTRACT(EPOCH FROM (delivered_at - picked_up_at))/60), 0) as avg_delivery_time_minutes
      FROM delivery_orders 
      WHERE ${whereClause}
    `;

    const result = await this.db.query(statsQuery, params);
    const stats = result.rows[0];

    return {
      totalDeliveries: parseInt(stats.total_deliveries, 10),
      completedDeliveries: parseInt(stats.completed_deliveries, 10),
      totalEarnings: parseFloat(stats.total_earnings),
      averageRating: parseFloat(stats.average_rating),
      averageDeliveryTime: parseFloat(stats.avg_delivery_time_minutes),
    };
  }

  async recordLocationUpdate(locationUpdate: LocationUpdate): Promise<void> {
    await this.db.query(
      `INSERT INTO location_updates (delivery_agent_id, lat, lng, timestamp, speed, bearing)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        locationUpdate.deliveryAgentId,
        locationUpdate.lat,
        locationUpdate.lng,
        locationUpdate.timestamp,
        locationUpdate.speed,
        locationUpdate.bearing,
      ]
    );
  }

  private mapRowToDeliveryAgent(row: any): DeliveryAgent {
    return {
      id: row.id,
      userId: row.user_id,
      vehicleType: row.vehicle_type,
      licenseNumber: row.license_number,
      isActive: row.is_active,
      isAvailable: row.is_available,
      isOnDelivery: row.is_on_delivery,
      currentLat: row.current_lat,
      currentLng: row.current_lng,
      rating: parseFloat(row.rating || '0'),
      totalDeliveries: parseInt(row.total_deliveries || '0', 10),
      totalEarnings: parseFloat(row.total_earnings || '0'),
      joinedAt: row.joined_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
