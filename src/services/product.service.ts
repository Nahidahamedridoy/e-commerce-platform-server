import { prisma } from '../config/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { Prisma } from '@prisma/client';

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export interface GetProductsFilter {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'price' | 'name' | 'stock';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  categoryId: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  images?: string[];
  categoryId?: string;
}

export class ProductService {
  static async getAll(filter: GetProductsFilter) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }

    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      where.price = {};
      if (filter.minPrice !== undefined) {
        where.price.gte = filter.minPrice;
      }
      if (filter.maxPrice !== undefined) {
        where.price.lte = filter.maxPrice;
      }
    }

    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getByIdOrSlug(idOrSlug: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundError(`Product '${idOrSlug}' not found`);
    }

    return product;
  }

  static async create(input: CreateProductInput) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new BadRequestError(`Category with ID '${input.categoryId}' does not exist`);
    }

    let slug = slugify(input.name);
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    return prisma.product.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        price: input.price,
        stock: input.stock,
        images: input.images,
        categoryId: input.categoryId,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  static async update(id: string, input: UpdateProductInput) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) {
        throw new BadRequestError(`Category with ID '${input.categoryId}' does not exist`);
      }
    }

    let slug: string | undefined;
    if (input.name && input.name !== product.name) {
      slug = slugify(input.name);
      const conflict = await prisma.product.findFirst({
        where: {
          AND: [{ id: { not: id } }, { slug }],
        },
      });
      if (conflict) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
    }

    return prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        slug,
        description: input.description,
        price: input.price,
        stock: input.stock,
        images: input.images,
        categoryId: input.categoryId,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  static async delete(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product._count.orderItems > 0) {
      throw new BadRequestError(
        'Cannot delete product that is referenced in existing customer orders. Consider setting its stock to 0 instead.'
      );
    }

    return prisma.product.delete({
      where: { id },
    });
  }
}
