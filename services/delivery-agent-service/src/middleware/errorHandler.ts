import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  details?: any;
  code?: string;
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message, isOperational = false } = error;

  // Log the error
  logger.error(`Error ${statusCode}: ${message}`, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: error.stack,
    isOperational,
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (error.name === 'UnauthorizedError' || error.message === 'jwt malformed') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
  } else if (error.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced resource does not exist';
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorResponse: any = {
    success: false,
    message: isOperational ? message : 'Internal server error',
    error: isDevelopment ? error.message : undefined,
  };

  if (isDevelopment && error.stack) {
    errorResponse.stack = error.stack;
  }

  if (error.details) {
    errorResponse.details = error.details;
  }

  res.status(statusCode).json(errorResponse);
};
