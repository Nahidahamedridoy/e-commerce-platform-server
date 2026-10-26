import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';
import { Role } from '@prisma/client';

export class OrderController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const order = await OrderService.createOrder({
        userId: req.user.userId,
        items: req.body.items,
        shippingAddress: req.body.shippingAddress,
        contactPhone: req.body.contactPhone,
        paymentMethod: req.body.paymentMethod,
      });

      sendSuccess(res, { order }, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await OrderService.getMyOrders(req.user.userId, req.query as any);
      sendSuccess(res, { orders: result.orders }, 'My orders retrieved successfully', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getAllOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await OrderService.getAllOrders(req.query as any);
      sendSuccess(res, { orders: result.orders }, 'All orders retrieved successfully', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const order = await OrderService.getOrderById(
        req.params.id as string,
        req.user.userId,
        req.user.role
      );

      sendSuccess(res, { order }, 'Order retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await OrderService.updateStatus(req.params.id as string, req.body);
      sendSuccess(res, { order }, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const order = await OrderService.cancelOrder(
        req.params.id as string,
        req.user.userId,
        req.user.role
      );

      sendSuccess(res, { order }, 'Order cancelled successfully');
    } catch (error) {
      next(error);
    }
  }
}
