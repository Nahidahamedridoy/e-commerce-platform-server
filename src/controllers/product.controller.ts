import { Request, Response, NextFunction } from 'express';
import { ProductService, GetProductsFilter } from '../services/product.service';
import { sendSuccess } from '../utils/response';

export class ProductController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProductService.getAll(req.query as unknown as GetProductsFilter);
      sendSuccess(
        res,
        { products: result.products },
        'Products retrieved successfully',
        200,
        result.meta
      );
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.getByIdOrSlug(req.params.id as string);
      sendSuccess(res, { product }, 'Product retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.create(req.body);
      sendSuccess(res, { product }, 'Product created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.update(req.params.id as string, req.body);
      sendSuccess(res, { product }, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ProductService.delete(req.params.id as string);
      sendSuccess(res, null, 'Product deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
