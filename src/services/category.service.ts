import { prisma } from '../config/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export class CategoryService {
  static async getAll() {
    return prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getByIdOrSlug(idOrSlug: string) {
    const category = await prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        products: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundError(`Category '${idOrSlug}' not found`);
    }

    return category;
  }

  static async create(data: { name: string; description?: string; image?: string }) {
    const slug = slugify(data.name);

    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: data.name }, { slug }],
      },
    });

    if (existing) {
      throw new ConflictError('A category with this name already exists');
    }

    return prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
      },
    });
  }

  static async update(
    id: string,
    data: { name?: string; description?: string; image?: string }
  ) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    let slug: string | undefined;
    if (data.name && data.name !== category.name) {
      slug = slugify(data.name);
      const conflict = await prisma.category.findFirst({
        where: {
          AND: [{ id: { not: id } }, { OR: [{ name: data.name }, { slug }] }],
        },
      });
      if (conflict) {
        throw new ConflictError('A category with this name already exists');
      }
    }

    return prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
      },
    });
  }

  static async delete(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (category._count.products > 0) {
      throw new BadRequestError(
        `Cannot delete category with ${category._count.products} associated product(s). Remove or reassign the products first.`
      );
    }

    return prisma.category.delete({
      where: { id },
    });
  }
}
