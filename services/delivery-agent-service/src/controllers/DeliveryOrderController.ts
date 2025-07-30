import { Request, Response } from 'express';
import { DeliveryOrderService } from '../services/DeliveryOrderService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class DeliveryOrderController {
  constructor(private deliveryOrderService: DeliveryOrderService) {}

  async getOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const order = await this.deliveryOrderService.getOrder(orderId);
      
      res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      logger.error('Error fetching order:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to fetch order'
      });
    }
  }

  async acceptOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { orderId } = req.params;
      const order = await this.deliveryOrderService.acceptOrder(orderId, agentId);
      
      res.json({
        success: true,
        message: 'Order accepted successfully',
        data: order
      });
    } catch (error: any) {
      logger.error('Error accepting order:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to accept order'
      });
    }
  }

  async rejectOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { orderId } = req.params;
      const { reason } = req.body as { reason?: string };
      
      await this.deliveryOrderService.rejectOrder(orderId, agentId, reason);
      
      res.json({
        success: true,
        message: 'Order rejected successfully'
      });
    } catch (error: any) {
      logger.error('Error rejecting order:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to reject order'
      });
    }
  }

  async updateOrderStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const agentId = req.user?.id;
      if (!agentId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { orderId } = req.params;
      const updateData = req.body;
      
      const updatedOrder = await this.deliveryOrderService.updateOrderStatus(
        orderId,
        agentId,
        updateData
      );
      
      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder
      });
    } catch (error: any) {
      logger.error('Error updating order status:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update order status'
      });
    }
  }
}
