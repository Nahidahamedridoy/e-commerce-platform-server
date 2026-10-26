import { Request } from 'express';
import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
