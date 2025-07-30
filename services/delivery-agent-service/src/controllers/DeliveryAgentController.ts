import { Request, Response } from 'express';
import { DeliveryAgentService } from '../services/DeliveryAgentService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class DeliveryAgentController {
  constructor(private deliveryAgentService: DeliveryAgentService) {}

  async updateLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { latitude, longitude } = req.body as { latitude: number; longitude: number };
      await this.deliveryAgentService.updateLocation(agentId, { lat: latitude, lng: longitude });
      
      res.json({
        success: true,
        message: 'Location updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating agent location:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update location'
      });
    }
  }

  async updateAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { isAvailable } = req.body as { isAvailable: boolean };
      await this.deliveryAgentService.updateAvailability(agentId, { isAvailable });
      
      res.json({
        success: true,
        message: 'Availability updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating agent availability:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update availability'
      });
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const profile = await this.deliveryAgentService.getAgentProfile(agentId);
      
      res.json({
        success: true,
        data: profile
      });
    } catch (error: any) {
      logger.error('Error fetching agent profile:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to fetch profile'
      });
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const updateData = req.body;
      const updatedProfile = await this.deliveryAgentService.updateProfile(agentId, updateData);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error: any) {
      logger.error('Error updating agent profile:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update profile'
      });
    }
  }

  async getActiveDelivery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const activeDelivery = await this.deliveryAgentService.getActiveDelivery(agentId);
      
      res.json({
        success: true,
        data: activeDelivery
      });
    } catch (error: any) {
      logger.error('Error fetching active delivery:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to fetch active delivery'
      });
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { startDate, endDate } = req.query;
      const stats = await this.deliveryAgentService.getAgentStats(
        agentId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error fetching agent stats:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to fetch stats'
      });
    }
  }
}
