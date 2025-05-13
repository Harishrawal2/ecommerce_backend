import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError } from '../utils/appError';

const prisma = new PrismaClient();

// Get all users
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  const total = await prisma.user.count();

  res.status(200).json({
    status: 'success',
    results: users.length,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: {
      users,
    },
  });
});

// Get user by ID
export const getUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      addresses: true,
      _count: {
        select: {
          orders: true,
          reviews: true,
        },
      },
    },
  });

  if (!user) {
    return next(new NotFoundError('User not found'));
  }

  // Get user's recent orders
  const recentOrders = await prisma.order.findMany({
    where: { userId: id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user,
      recentOrders,
    },
  });
});

// Get all orders
export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status as string;

  const filter: any = {};
  if (status) {
    filter.status = status;
  }

  const orders = await prisma.order.findMany({
    where: filter,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  const total = await prisma.order.count({ where: filter });

  res.status(200).json({
    status: 'success',
    results: orders.length,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: {
      orders,
    },
  });
});

// Get order by ID
export const getOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    return next(new NotFoundError('Order not found'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
});

// Update order status
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
    return next(new NotFoundError('Invalid status'));
  }

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    return next(new NotFoundError('Order not found'));
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      order: updatedOrder,
    },
  });
});

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  // Get total users count
  const totalUsers = await prisma.user.count();

  // Get total products count
  const totalProducts = await prisma.product.count();

  // Get total orders count
  const totalOrders = await prisma.order.count();

  // Get total revenue
  const revenue = await prisma.order.aggregate({
    where: {
      status: {
        in: ['DELIVERED', 'SHIPPED'],
      },
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Get recent orders
  const recentOrders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Get low stock products
  const lowStockProducts = await prisma.product.findMany({
    where: {
      stock: {
        lte: 10,
      },
    },
    select: {
      id: true,
      title: true,
      stock: true,
      price: true,
    },
    orderBy: { stock: 'asc' },
    take: 5,
  });

  // Get order status counts
  const orderStatusCounts = await prisma.$queryRaw`
    SELECT status, COUNT(*) as count
    FROM "Order"
    GROUP BY status
  `;

  res.status(200).json({
    status: 'success',
    data: {
      totalUsers,
      totalProducts,
      totalOrders,
      revenue: revenue._sum.totalAmount || 0,
      recentOrders,
      lowStockProducts,
      orderStatusCounts,
    },
  });
});