import { Request, Response, NextFunction } from 'express';
import { MenuService } from '../services/MenuService';
import { CreateMenuItemRequest, UpdateMenuItemRequest } from '../models/types';
import { logger } from '../utils/logger';
import '../types/express';

class AppError extends Error {
  constructor(public override message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}

export class MenuController {
  constructor(private menuService: MenuService) {}

  async getMenuItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = (req as any).user?.id;
      if (!restaurantId) {
        throw new AppError('Unauthorized', 401);
      }

      const {
        category,
        isAvailable,
        page = 1,
        limit = 20,
      } = req.query;

      const filters = {
        category: category as string,
        isAvailable: isAvailable === 'true' ? true : isAvailable === 'false' ? false : undefined,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await this.menuService.getMenuItems(restaurantId, filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });

      logger.info(`Menu items fetched for restaurant: ${restaurantId}`);
    } catch (error) {
      next(error);
    }
  }

  async getMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const menuItem = await this.menuService.getMenuItem(id);

      res.json({
        success: true,
        data: menuItem,
      });

      logger.info(`Menu item fetched: ${id}`);
    } catch (error) {
      next(error);
    }
  }

  async createMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = (req as any).user?.id;
      if (!restaurantId) {
        throw new AppError('Unauthorized', 401);
      }

      const data: CreateMenuItemRequest = req.body;

      // Validate required fields
      if (!data.name || data.name.trim().length === 0) {
        throw new AppError('Name is required', 400);
      }

      if (!data.price || data.price <= 0) {
        throw new AppError('Valid price is required', 400);
      }

      if (!data.category || data.category.trim().length === 0) {
        throw new AppError('Category is required', 400);
      }

      const menuItem = await this.menuService.createMenuItem(restaurantId, data);

      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: menuItem,
      });

      logger.info(`Menu item created: ${menuItem.id} for restaurant: ${restaurantId}`);
    } catch (error) {
      next(error);
    }
  }

  async updateMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateMenuItemRequest = req.body;

      // Validate price if provided
      if (data.price !== undefined && data.price <= 0) {
        throw new AppError('Price must be greater than 0', 400);
      }

      const menuItem = await this.menuService.updateMenuItem(id, data);

      res.json({
        success: true,
        message: 'Menu item updated successfully',
        data: menuItem,
      });

      logger.info(`Menu item updated: ${id}`);
    } catch (error) {
      next(error);
    }
  }

  async deleteMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.menuService.deleteMenuItem(id);

      res.json({
        success: true,
        message: 'Menu item deleted successfully',
      });

      logger.info(`Menu item deleted: ${id}`);
    } catch (error) {
      next(error);
    }
  }

  async updateMenuItemAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isAvailable } = req.body;

      if (typeof isAvailable !== 'boolean') {
        throw new AppError('isAvailable must be a boolean', 400);
      }

      const menuItem = await this.menuService.updateMenuItemAvailability(id, isAvailable);

      res.json({
        success: true,
        message: 'Menu item availability updated successfully',
        data: menuItem,
      });

      logger.info(`Menu item availability updated: ${id} - ${isAvailable}`);
    } catch (error) {
      next(error);
    }
  }

  async getMenuCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = (req as any).user?.id;
      if (!restaurantId) {
        throw new AppError('Unauthorized', 401);
      }

      const categories = await this.menuService.getMenuCategories(restaurantId);

      res.json({
        success: true,
        data: categories,
      });

      logger.info(`Menu categories fetched for restaurant: ${restaurantId}`);
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = (req as any).user?.id;
      if (!restaurantId) {
        throw new AppError('Unauthorized', 401);
      }

      const { updates } = req.body;

      if (!Array.isArray(updates)) {
        throw new AppError('Updates must be an array', 400);
      }

      // Validate updates format
      for (const update of updates) {
        if (!update.id || typeof update.isAvailable !== 'boolean') {
          throw new AppError('Each update must have id and isAvailable properties', 400);
        }
      }

      const updatedItems = await this.menuService.bulkUpdateAvailability(restaurantId, updates);

      res.json({
        success: true,
        message: 'Menu items availability updated successfully',
        data: updatedItems,
      });

      logger.info(`Bulk availability update completed for restaurant: ${restaurantId}`);
    } catch (error) {
      next(error);
    }
  }
}
