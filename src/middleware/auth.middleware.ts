import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyToken } from '../utils/token';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      next(err);
      return;
    }
    next(new UnauthorizedError('Invalid or expired authentication token'));
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('User authentication required'));
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      next(new ForbiddenError(`Access denied: Requires ${roles.join(' or ')} role`));
      return;
    }

    next();
  };
};
