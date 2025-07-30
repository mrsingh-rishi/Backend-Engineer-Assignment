import { Request, Response, NextFunction } from 'express';
import { RestaurantService } from '../services/RestaurantService';
import { RestaurantRepository } from '../repositories/RestaurantRepository';
import { getDatabase } from '../config/database';
import { ApiError } from '../middlewares/errorHandler';

export class RestaurantController {
  private restaurantService: RestaurantService;

  constructor() {
    const db = getDatabase();
    const restaurantRepository = new RestaurantRepository(db);
    this.restaurantService = new RestaurantService(restaurantRepository);
  }

  /**
   * @swagger
   * /api/restaurants:
   *   get:
   *     summary: Get available restaurants
   *     tags: [Restaurants]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *       - in: query
   *         name: cuisine
   *         schema:
   *           type: string
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of available restaurants
   */
  getRestaurants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, cuisine, search } = req.query;
      
      const result = await this.restaurantService.getRestaurants({
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        cuisine: cuisine as string,
        search: search as string,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/restaurants/{id}:
   *   get:
   *     summary: Get restaurant details
   *     tags: [Restaurants]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Restaurant details
   *       404:
   *         description: Restaurant not found
   */
  getRestaurantById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        const error: ApiError = new Error('Restaurant ID is required');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      const restaurant = await this.restaurantService.getRestaurantById(id);

      if (!restaurant) {
        const error: ApiError = new Error('Restaurant not found or not available');
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      res.json({
        success: true,
        data: restaurant,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/restaurants/{id}/menu:
   *   get:
   *     summary: Get restaurant menu
   *     tags: [Restaurants]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Restaurant menu items
   *       404:
   *         description: Restaurant not found
   */
  getRestaurantMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        const error: ApiError = new Error('Restaurant ID is required');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      const menuItems = await this.restaurantService.getRestaurantMenu(id);

      res.json({
        success: true,
        data: menuItems,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/restaurants/online:
   *   get:
   *     summary: Get online restaurants
   *     tags: [Restaurants]
   *     responses:
   *       200:
   *         description: List of online restaurants
   */
  getOnlineRestaurants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const restaurants = await this.restaurantService.getOnlineRestaurants();

      res.json({
        success: true,
        data: restaurants,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/restaurants/search:
   *   get:
   *     summary: Search restaurants
   *     tags: [Restaurants]
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *     responses:
   *       200:
   *         description: Search results
   */
  searchRestaurants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q: searchTerm, page, limit } = req.query;

      if (!searchTerm) {
        const error: ApiError = new Error('Search term is required');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      const result = await this.restaurantService.searchRestaurants(searchTerm as string, {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
