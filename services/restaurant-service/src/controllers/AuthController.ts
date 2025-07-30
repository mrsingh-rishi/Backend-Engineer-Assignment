import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { RestaurantRepository } from '../repositories/RestaurantRepository';
import { getDatabase } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { RestaurantLoginRequest, RestaurantLoginResponse } from '../models/types';

export class AuthController {
  private restaurantRepository: RestaurantRepository | null = null;

  private getRepository(): RestaurantRepository {
    if (!this.restaurantRepository) {
      this.restaurantRepository = new RestaurantRepository(getDatabase());
    }
    return this.restaurantRepository;
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Restaurant login
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password }: RestaurantLoginRequest = req.body;

      if (!email || !password) {
        const error: ApiError = new Error('Email and password are required');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      // Find restaurant by email
      const repository = this.getRepository();
      const restaurant = await repository.findByEmail(email);
      if (!restaurant) {
        const error: ApiError = new Error('Invalid credentials');
        error.statusCode = 401;
        error.isOperational = true;
        throw error;
      }

      // Verify password (assuming password is stored as password_hash in db)
      const restaurantWithPassword = await getDatabase().query(
        'SELECT password_hash FROM restaurants WHERE id = $1',
        [restaurant.id]
      );
      
      const isValidPassword = await bcrypt.compare(password, restaurantWithPassword.rows[0].password_hash);
      if (!isValidPassword) {
        const error: ApiError = new Error('Invalid credentials');
        error.statusCode = 401;
        error.isOperational = true;
        throw error;
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: restaurant.id,
          email: restaurant.email,
          role: 'restaurant',
          restaurantId: restaurant.id,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        {
          id: restaurant.id,
          email: restaurant.email,
          role: 'restaurant',
          restaurantId: restaurant.id,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
      );

      const response: RestaurantLoginResponse = {
        token,
        refreshToken,
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          email: restaurant.email,
          isOnline: restaurant.isOnline,
        },
      };

      res.json({
        success: true,
        message: 'Login successful',
        data: response,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     summary: Refresh access token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *       401:
   *         description: Invalid refresh token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        const error: ApiError = new Error('Refresh token is required');
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;

      // Generate new access token
      const newToken = jwt.sign(
        {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          restaurantId: decoded.restaurantId,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
        },
      });
    } catch (error) {
      const authError: ApiError = new Error('Invalid refresh token');
      authError.statusCode = 401;
      authError.isOperational = true;
      next(authError);
    }
  };
}
