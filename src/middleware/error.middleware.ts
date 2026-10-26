import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, NotFoundError } from '../utils/errors';
import { sendError } from '../utils/response';
import { env } from '../config/env';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Operational App Errors
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  // Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || ['field'];
        sendError(
          res,
          `A record with this ${target.join(', ')} already exists`,
          409
        );
        return;
      }
      case 'P2025':
        sendError(res, 'Record not found', 404);
        return;
      case 'P2003':
        sendError(res, 'Related record not found or constraint failed', 400);
        return;
      default:
        sendError(
          res,
          'Database operation failed',
          400,
          env.NODE_ENV === 'development' ? err.message : undefined
        );
        return;
    }
  }

  // Prisma Initialization / Connection error (e.g. database not reachable)
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('❌ Prisma Initialization Error:', err.message);
    sendError(
      res,
      'Database connection is not available. Please ensure PostgreSQL is running and DATABASE_URL is configured.',
      503
    );
    return;
  }

  // JSON parsing error in request body
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'Malformed JSON in request body', 400);
    return;
  }

  // Unexpected Errors
  console.error('💥 Unhandled Error:', err);
  const message =
    env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'Internal Server Error';

  sendError(res, message, 500);
};
