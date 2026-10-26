import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { sendSuccess } from '../utils/response';

export class CategoryController {
  static async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await CategoryService.getAll();
      sendSuccess(res, { categories }, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CategoryService.getByIdOrSlug(req.params.id as string);
      sendSuccess(res, { category }, 'Category retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CategoryService.create(req.body);
      sendSuccess(res, { category }, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CategoryService.update(req.params.id as string, req.body);
      sendSuccess(res, { category }, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CategoryService.delete(req.params.id as string);
      sendSuccess(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
