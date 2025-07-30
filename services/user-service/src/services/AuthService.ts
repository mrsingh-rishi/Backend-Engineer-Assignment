import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { User, AuthPayload } from '../models/types';
import { setCache, getCache, deleteCache } from '../config/redis';
import { logger } from '../utils/logger';

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async register(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
  }): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create user
    const user = await this.userRepository.create(userData);

    // Remove password hash from response
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: 'user',
    });

    // Cache user session
    await this.cacheUserSession(user.id, userResponse);

    logger.info(`User registered successfully: ${user.email}`);

    return { user: userResponse, token };
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    // Verify credentials
    const user = await this.userRepository.verifyPassword(
      credentials.email,
      credentials.password
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Remove password hash from response
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: 'user',
    });

    // Cache user session
    await this.cacheUserSession(user.id, userResponse);

    logger.info(`User logged in successfully: ${user.email}`);

    return { user: userResponse, token };
  }

  async getProfile(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    // Try to get from cache first
    const cached = await this.getCachedUserSession(userId);
    if (cached) {
      return cached;
    }

    // Get from database
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Cache for next time
    await this.cacheUserSession(userId, userResponse);

    return userResponse;
  }

  async updateProfile(
    userId: string,
    updateData: {
      name?: string;
      phone?: string;
      address?: string;
    }
  ): Promise<Omit<User, 'passwordHash'> | null> {
    const updatedUser = await this.userRepository.update(userId, updateData);
    if (!updatedUser) {
      return null;
    }

    const userResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      address: updatedUser.address,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    // Update cache
    await this.cacheUserSession(userId, userResponse);

    logger.info(`User profile updated: ${updatedUser.email}`);

    return userResponse;
  }

  async logout(userId: string): Promise<void> {
    // Remove from cache
    await this.clearUserSession(userId);
    logger.info(`User logged out: ${userId}`);
  }

  private generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    } as jwt.SignOptions);
  }

  private async cacheUserSession(
    userId: string,
    user: Omit<User, 'passwordHash'>
  ): Promise<void> {
    try {
      await setCache(`user:${userId}`, JSON.stringify(user), 3600); // 1 hour
    } catch (error) {
      logger.error('Failed to cache user session:', error);
    }
  }

  private async getCachedUserSession(
    userId: string
  ): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const cached = await getCache(`user:${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached user session:', error);
      return null;
    }
  }

  private async clearUserSession(userId: string): Promise<void> {
    try {
      await deleteCache(`user:${userId}`);
    } catch (error) {
      logger.error('Failed to clear user session:', error);
    }
  }
}
