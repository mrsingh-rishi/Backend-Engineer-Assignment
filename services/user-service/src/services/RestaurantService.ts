import { RestaurantRepository } from '../repositories/RestaurantRepository';
import { Restaurant, MenuItem, PaginatedResponse } from '../models/types';
import { setCache, getCache } from '../config/redis';
import { logger } from '../utils/logger';

export class RestaurantService {
  constructor(private restaurantRepository: RestaurantRepository) {}

  async getRestaurants(params: {
    page: number;
    limit: number;
    cuisine?: string;
    search?: string;
  }): Promise<PaginatedResponse<Restaurant>> {
    try {
      // Try to get from cache first for popular queries
      const cacheKey = `restaurants:${JSON.stringify(params)}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const { restaurants, total } = await this.restaurantRepository.findMany({
        ...params,
        onlineOnly: true, // Only show online restaurants to users
      });

      const totalPages = Math.ceil(total / params.limit);

      const response: PaginatedResponse<Restaurant> = {
        success: true,
        data: restaurants,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
        },
      };

      // Cache for 5 minutes
      await setCache(cacheKey, JSON.stringify(response), 300);

      return response;
    } catch (error) {
      logger.error('Error getting restaurants:', error);
      throw new Error('Failed to fetch restaurants');
    }
  }

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    try {
      // Try cache first
      const cacheKey = `restaurant:${id}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const restaurant = await this.restaurantRepository.findById(id);
      if (!restaurant) {
        return null;
      }

      // Only return if restaurant is online
      if (!restaurant.isOnline) {
        return null;
      }

      // Cache for 10 minutes
      await setCache(cacheKey, JSON.stringify(restaurant), 600);

      return restaurant;
    } catch (error) {
      logger.error('Error getting restaurant:', error);
      throw new Error('Failed to fetch restaurant');
    }
  }

  async getRestaurantMenu(restaurantId: string): Promise<MenuItem[]> {
    try {
      // Check if restaurant exists and is online
      const restaurant = await this.getRestaurantById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found or not available');
      }

      // Try cache first
      const cacheKey = `menu:${restaurantId}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const menuItems = await this.restaurantRepository.getMenuItems(restaurantId);

      // Cache for 5 minutes
      await setCache(cacheKey, JSON.stringify(menuItems), 300);

      return menuItems;
    } catch (error) {
      logger.error('Error getting restaurant menu:', error);
      throw new Error('Failed to fetch restaurant menu');
    }
  }

  async getOnlineRestaurants(): Promise<Restaurant[]> {
    try {
      // Try cache first
      const cacheKey = 'restaurants:online';
      const cached = await getCache(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const restaurants = await this.restaurantRepository.findOnlineRestaurants();

      // Cache for 2 minutes (shorter cache for real-time status)
      await setCache(cacheKey, JSON.stringify(restaurants), 120);

      return restaurants;
    } catch (error) {
      logger.error('Error getting online restaurants:', error);
      throw new Error('Failed to fetch online restaurants');
    }
  }

  async searchRestaurants(
    searchTerm: string,
    params: { page: number; limit: number }
  ): Promise<PaginatedResponse<Restaurant>> {
    try {
      const { restaurants, total } = await this.restaurantRepository.findMany({
        ...params,
        search: searchTerm,
        onlineOnly: true,
      });

      const totalPages = Math.ceil(total / params.limit);

      return {
        success: true,
        data: restaurants,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error searching restaurants:', error);
      throw new Error('Failed to search restaurants');
    }
  }
}
