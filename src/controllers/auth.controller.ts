import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      sendSuccess(res, result, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      sendSuccess(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const user = await AuthService.getProfile(req.user.userId);
      sendSuccess(res, { user }, 'Profile retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const user = await AuthService.updateProfile(req.user.userId, req.body);
      sendSuccess(res, { user }, 'Profile updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
