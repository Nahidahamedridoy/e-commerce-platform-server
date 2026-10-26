import { prisma } from '../config/prisma';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  userId: string;
  items: CreateOrderItemInput[];
  shippingAddress: string;
  contactPhone: string;
  paymentMethod?: string;
}

export interface GetOrdersQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export class OrderService {
  /**
   * Atomic Order Creation with Stock Validation & Decrement within Transaction
   */
  static async createOrder(input: CreateOrderInput) {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestError('Order must contain at least one item');
    }

    // Execute within a database transaction
    const order = await prisma.$transaction(async (tx) => {
      let calculatedTotal = 0;
      const orderItemsData: { productId: string; quantity: number; price: number }[] = [];

      for (const item of input.items) {
        // Fetch current product state within transaction
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundError(`Product with ID '${item.productId}' not found`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for '${product.name}'. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }

        // Decrement product stock
        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        const lineTotal = product.price * item.quantity;
        calculatedTotal += lineTotal;

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        });
      }

      // Create Order and nested OrderItems
      const newOrder = await tx.order.create({
        data: {
          userId: input.userId,
          totalAmount: parseFloat(calculatedTotal.toFixed(2)),
          shippingAddress: input.shippingAddress,
          contactPhone: input.contactPhone,
          paymentMethod: input.paymentMethod || 'CASH_ON_DELIVERY',
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, slug: true, images: true },
              },
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return newOrder;
    });

    return order;
  }

  static async getMyOrders(userId: string, query: GetOrdersQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, slug: true, images: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getAllOrders(query: GetOrdersQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = query.status ? { status: query.status } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getOrderById(orderId: string, currentUserId: string, currentUserRole: Role) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, images: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (currentUserRole !== Role.ADMIN && order.userId !== currentUserId) {
      throw new ForbiddenError('Access denied: You can only view your own orders');
    }

    return order;
  }

  static async updateStatus(
    orderId: string,
    data: { status?: OrderStatus; paymentStatus?: PaymentStatus }
  ) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return prisma.order.update({
      where: { id: orderId },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
      },
      include: {
        items: true,
      },
    });
  }

  static async cancelOrder(orderId: string, currentUserId: string, currentUserRole: Role) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (currentUserRole !== Role.ADMIN && order.userId !== currentUserId) {
      throw new ForbiddenError('Access denied: You can only cancel your own orders');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestError('Order is already cancelled');
    }

    if (order.status !== OrderStatus.PENDING && currentUserRole !== Role.ADMIN) {
      throw new BadRequestError(
        `Orders in '${order.status}' status cannot be cancelled by customer`
      );
    }

    // Restore stock and update status atomically in transaction
    return prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
        },
        include: {
          items: true,
        },
      });
    });
  }
}
