import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { ApiError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    restaurantId?: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const error: ApiError = new Error('Access token is required');
    error.statusCode = 401;
    error.isOperational = true;
    return next(error);
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      restaurantId: decoded.restaurantId,
    };
    next();
  } catch (error) {
    const authError: ApiError = new Error('Invalid or expired token');
    authError.statusCode = 401;
    authError.isOperational = true;
    next(authError);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error: ApiError = new Error('Authentication required');
      error.statusCode = 401;
      error.isOperational = true;
      return next(error);
    }

    if (!roles.includes(req.user.role)) {
      const error: ApiError = new Error('Insufficient permissions');
      error.statusCode = 403;
      error.isOperational = true;
      return next(error);
    }

    next();
  };
};

export const requireRestaurant = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    const error: ApiError = new Error('Authentication required');
    error.statusCode = 401;
    error.isOperational = true;
    return next(error);
  }

  if (req.user.role !== 'restaurant') {
    const error: ApiError = new Error('Restaurant access required');
    error.statusCode = 403;
    error.isOperational = true;
    return next(error);
  }

  if (!req.user.restaurantId) {
    const error: ApiError = new Error('Restaurant ID not found in token');
    error.statusCode = 400;
    error.isOperational = true;
    return next(error);
  }

  next();
};
