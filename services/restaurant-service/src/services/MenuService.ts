import { Pool } from 'pg';
import { MenuItem, CreateMenuItemRequest, UpdateMenuItemRequest, PaginatedResponse } from '../models/types';
import { MenuRepository } from '../repositories/MenuRepository';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

class AppError extends Error {
  constructor(public override message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}

export class MenuService {
  private menuRepository: MenuRepository;
  private redisClient = getRedisClient();

  constructor(db: Pool) {
    this.menuRepository = new MenuRepository(db);
  }

  async getMenuItems(
    restaurantId: string,
    filters?: {
      category?: string;
      isAvailable?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<MenuItem>> {
    try {
      // Create cache key
      const cacheKey = `menu:${restaurantId}:${JSON.stringify(filters || {})}`;
      
      // Try to get from cache first
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for menu items: ${restaurantId}`);
        return JSON.parse(cached);
      }

      const result = await this.menuRepository.findByRestaurantId(restaurantId, filters);
      
      // Cache for 5 minutes
      await this.redisClient.setex(cacheKey, 300, JSON.stringify(result));
      
      return result;
    } catch (error) {
      logger.error('Error fetching menu items:', error);
      throw new AppError('Failed to fetch menu items', 500);
    }
  }

  async getMenuItem(id: string): Promise<MenuItem> {
    try {
      // Try cache first
      const cacheKey = `menu_item:${id}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const menuItem = await this.menuRepository.findById(id);
      if (!menuItem) {
        throw new AppError('Menu item not found', 404);
      }

      // Cache for 10 minutes
      await this.redisClient.setex(cacheKey, 600, JSON.stringify(menuItem));
      
      return menuItem;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching menu item:', error);
      throw new AppError('Failed to fetch menu item', 500);
    }
  }

  async createMenuItem(restaurantId: string, data: CreateMenuItemRequest): Promise<MenuItem> {
    try {
      // Validate price
      if (data.price <= 0) {
        throw new AppError('Price must be greater than 0', 400);
      }

      // Validate category
      if (!data.category || data.category.trim().length === 0) {
        throw new AppError('Category is required', 400);
      }

      const menuItem = await this.menuRepository.create(restaurantId, data);
      
      // Clear related caches
      await this.clearMenuCaches(restaurantId);
      
      logger.info(`Menu item created: ${menuItem.id} for restaurant: ${restaurantId}`);
      return menuItem;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating menu item:', error);
      throw new AppError('Failed to create menu item', 500);
    }
  }

  async updateMenuItem(id: string, data: UpdateMenuItemRequest): Promise<MenuItem> {
    try {
      // Validate price if provided
      if (data.price !== undefined && data.price <= 0) {
        throw new AppError('Price must be greater than 0', 400);
      }

      const updatedItem = await this.menuRepository.update(id, data);
      if (!updatedItem) {
        throw new AppError('Menu item not found', 404);
      }

      // Clear caches
      await this.clearMenuCaches(updatedItem.restaurantId);
      await this.redisClient.del(`menu_item:${id}`);
      
      logger.info(`Menu item updated: ${id}`);
      return updatedItem;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating menu item:', error);
      throw new AppError('Failed to update menu item', 500);
    }
  }

  async deleteMenuItem(id: string): Promise<void> {
    try {
      const menuItem = await this.menuRepository.findById(id);
      if (!menuItem) {
        throw new AppError('Menu item not found', 404);
      }

      const deleted = await this.menuRepository.delete(id);
      if (!deleted) {
        throw new AppError('Failed to delete menu item', 500);
      }

      // Clear caches
      await this.clearMenuCaches(menuItem.restaurantId);
      await this.redisClient.del(`menu_item:${id}`);
      
      logger.info(`Menu item deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting menu item:', error);
      throw new AppError('Failed to delete menu item', 500);
    }
  }

  async updateMenuItemAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
    try {
      const updatedItem = await this.menuRepository.updateAvailability(id, isAvailable);
      if (!updatedItem) {
        throw new AppError('Menu item not found', 404);
      }

      // Clear caches
      await this.clearMenuCaches(updatedItem.restaurantId);
      await this.redisClient.del(`menu_item:${id}`);
      
      logger.info(`Menu item availability updated: ${id} - ${isAvailable}`);
      return updatedItem;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating menu item availability:', error);
      throw new AppError('Failed to update menu item availability', 500);
    }
  }

  async getMenuCategories(restaurantId: string): Promise<string[]> {
    try {
      const cacheKey = `menu_categories:${restaurantId}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const categories = await this.menuRepository.getCategories(restaurantId);
      
      // Cache for 30 minutes
      await this.redisClient.setex(cacheKey, 1800, JSON.stringify(categories));
      
      return categories;
    } catch (error) {
      logger.error('Error fetching menu categories:', error);
      throw new AppError('Failed to fetch menu categories', 500);
    }
  }

  async bulkUpdateAvailability(
    restaurantId: string, 
    updates: Array<{ id: string; isAvailable: boolean }>
  ): Promise<MenuItem[]> {
    try {
      const updatedItems: MenuItem[] = [];
      
      for (const update of updates) {
        const item = await this.menuRepository.updateAvailability(update.id, update.isAvailable);
        if (item && item.restaurantId === restaurantId) {
          updatedItems.push(item);
        }
      }

      // Clear caches
      await this.clearMenuCaches(restaurantId);
      
      logger.info(`Bulk availability update completed for restaurant: ${restaurantId}`);
      return updatedItems;
    } catch (error) {
      logger.error('Error in bulk availability update:', error);
      throw new AppError('Failed to update menu items availability', 500);
    }
  }

  private async clearMenuCaches(restaurantId: string): Promise<void> {
    try {
      // Clear all menu-related caches for this restaurant
      const keys = await this.redisClient.keys(`menu:${restaurantId}:*`);
      keys.push(`menu_categories:${restaurantId}`);
      
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      logger.warn('Error clearing menu caches:', error);
      // Don't throw error for cache clearing failures
    }
  }
}
