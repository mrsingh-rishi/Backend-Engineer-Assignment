import { Pool } from 'pg';
import { Producer } from 'kafkajs';
import { 
  DeliveryAgent, 
  DeliveryOrder, 
  UpdateLocationRequest, 
  UpdateAvailabilityRequest,
  UpdateProfileRequest,
  LocationUpdate,
  PaginatedResponse,
  DeliveryFilters
} from '../models/types';
import { DeliveryAgentRepository } from '../repositories/DeliveryAgentRepository';
import { DeliveryOrderRepository } from '../repositories/DeliveryOrderRepository';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { getDistance } from 'geolib';

class AppError extends Error {
  constructor(public override message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}

export class DeliveryAgentService {
  private agentRepository: DeliveryAgentRepository;
  private orderRepository: DeliveryOrderRepository;
  private redisClient = getRedisClient();
  private kafkaProducer: Producer;

  constructor(db: Pool, kafkaProducer: Producer) {
    this.agentRepository = new DeliveryAgentRepository(db);
    this.orderRepository = new DeliveryOrderRepository(db);
    this.kafkaProducer = kafkaProducer;
  }

  async getAgentProfile(agentId: string): Promise<DeliveryAgent> {
    try {
      // Try cache first
      const cacheKey = `agent:${agentId}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const agent = await this.agentRepository.findById(agentId);
      if (!agent) {
        throw new AppError('Delivery agent not found', 404);
      }

      // Cache for 5 minutes
      await this.redisClient.setex(cacheKey, 300, JSON.stringify(agent));
      
      return agent;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching agent profile:', error);
      throw new AppError('Failed to fetch agent profile', 500);
    }
  }

  async updateProfile(agentId: string, data: UpdateProfileRequest): Promise<DeliveryAgent> {
    try {
      const updatedAgent = await this.agentRepository.updateProfile(agentId, data);
      if (!updatedAgent) {
        throw new AppError('Delivery agent not found', 404);
      }

      // Clear cache
      await this.redisClient.del(`agent:${agentId}`);
      
      logger.info(`Agent profile updated: ${agentId}`);
      return updatedAgent;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating agent profile:', error);
      throw new AppError('Failed to update agent profile', 500);
    }
  }

  async updateLocation(agentId: string, locationData: UpdateLocationRequest): Promise<void> {
    try {
      const { lat, lng, speed, bearing } = locationData;

      // Validate coordinates
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new AppError('Invalid coordinates', 400);
      }

      // Update agent location
      const updated = await this.agentRepository.updateLocation(agentId, { lat, lng });
      if (!updated) {
        throw new AppError('Delivery agent not found', 404);
      }

      // Record location update for tracking
      const locationUpdate: LocationUpdate = {
        deliveryAgentId: agentId,
        lat,
        lng,
        timestamp: new Date(),
        speed,
        bearing,
      };

      await this.agentRepository.recordLocationUpdate(locationUpdate);

      // Cache current location
      const locationKey = `agent_location:${agentId}`;
      await this.redisClient.setex(locationKey, 300, JSON.stringify({ lat, lng, timestamp: new Date() }));

      // Publish location update event
      await this.publishLocationUpdate(locationUpdate);

      // Clear agent cache
      await this.redisClient.del(`agent:${agentId}`);

      logger.info(`Location updated for agent: ${agentId}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating location:', error);
      throw new AppError('Failed to update location', 500);
    }
  }

  async updateAvailability(agentId: string, data: UpdateAvailabilityRequest): Promise<DeliveryAgent> {
    try {
      const updatedAgent = await this.agentRepository.updateAvailability(agentId, data.isAvailable);
      if (!updatedAgent) {
        throw new AppError('Delivery agent not found', 404);
      }

      // Clear caches
      await this.redisClient.del(`agent:${agentId}`);

      // Publish availability update
      await this.publishAvailabilityUpdate(agentId, data.isAvailable);

      logger.info(`Availability updated for agent: ${agentId} - ${data.isAvailable}`);
      return updatedAgent;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating availability:', error);
      throw new AppError('Failed to update availability', 500);
    }
  }

  async getActiveDelivery(agentId: string): Promise<DeliveryOrder | null> {
    try {
      const cacheKey = `active_delivery:${agentId}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const activeDelivery = await this.orderRepository.findActiveDelivery(agentId);
      
      if (activeDelivery) {
        // Cache for 1 minute
        await this.redisClient.setex(cacheKey, 60, JSON.stringify(activeDelivery));
      }

      return activeDelivery;
    } catch (error) {
      logger.error('Error fetching active delivery:', error);
      throw new AppError('Failed to fetch active delivery', 500);
    }
  }

  async getDeliveryHistory(
    agentId: string,
    filters?: DeliveryFilters
  ): Promise<PaginatedResponse<DeliveryOrder>> {
    try {
      const cacheKey = `delivery_history:${agentId}:${JSON.stringify(filters || {})}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await this.orderRepository.findByDeliveryAgent(agentId, filters);
      
      // Cache for 2 minutes
      await this.redisClient.setex(cacheKey, 120, JSON.stringify(result));
      
      return result;
    } catch (error) {
      logger.error('Error fetching delivery history:', error);
      throw new AppError('Failed to fetch delivery history', 500);
    }
  }

  async getAgentStats(agentId: string, startDate?: Date, endDate?: Date): Promise<{
    totalDeliveries: number;
    completedDeliveries: number;
    totalEarnings: number;
    averageRating: number;
    averageDeliveryTime: number;
    completionRate: number;
  }> {
    try {
      const cacheKey = `agent_stats:${agentId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const stats = await this.agentRepository.getAgentStats(agentId, startDate, endDate);
      const completionRate = stats.totalDeliveries > 0 
        ? (stats.completedDeliveries / stats.totalDeliveries) * 100 
        : 0;

      const result = {
        ...stats,
        completionRate,
      };

      // Cache for 10 minutes
      await this.redisClient.setex(cacheKey, 600, JSON.stringify(result));
      
      return result;
    } catch (error) {
      logger.error('Error fetching agent stats:', error);
      throw new AppError('Failed to fetch agent stats', 500);
    }
  }

  async findNearbyAgents(lat: number, lng: number, radiusKm: number = 10): Promise<DeliveryAgent[]> {
    try {
      const agents = await this.agentRepository.findAvailableAgentsNearLocation(lat, lng, radiusKm);
      return agents;
    } catch (error) {
      logger.error('Error finding nearby agents:', error);
      throw new AppError('Failed to find nearby agents', 500);
    }
  }

  private async publishLocationUpdate(locationUpdate: LocationUpdate): Promise<void> {
    try {
      const event = {
        type: 'AGENT_LOCATION_UPDATED',
        data: {
          agentId: locationUpdate.deliveryAgentId,
          location: {
            lat: locationUpdate.lat,
            lng: locationUpdate.lng,
          },
          speed: locationUpdate.speed,
          bearing: locationUpdate.bearing,
          timestamp: locationUpdate.timestamp.toISOString(),
        },
      };

      await this.kafkaProducer.send({
        topic: 'agent-events',
        messages: [
          {
            key: locationUpdate.deliveryAgentId,
            value: JSON.stringify(event),
          },
        ],
      });

      logger.info(`Published location update event: ${locationUpdate.deliveryAgentId}`);
    } catch (error) {
      logger.error('Error publishing location update:', error);
      // Don't throw error for event publishing failures
    }
  }

  private async publishAvailabilityUpdate(agentId: string, isAvailable: boolean): Promise<void> {
    try {
      const event = {
        type: 'AGENT_AVAILABILITY_UPDATED',
        data: {
          agentId,
          isAvailable,
          timestamp: new Date().toISOString(),
        },
      };

      await this.kafkaProducer.send({
        topic: 'agent-events',
        messages: [
          {
            key: agentId,
            value: JSON.stringify(event),
          },
        ],
      });

      logger.info(`Published availability update event: ${agentId}`);
    } catch (error) {
      logger.error('Error publishing availability update:', error);
      // Don't throw error for event publishing failures
    }
  }
}
