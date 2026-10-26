import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Operation successful',
  statusCode = 200,
  meta?: ApiResponse<T>['meta']
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta !== undefined && { meta }),
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  message = 'An error occurred',
  statusCode = 500,
  errors?: unknown
): Response => {
  const payload: ApiResponse = {
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  };
  return res.status(statusCode).json(payload);
};
