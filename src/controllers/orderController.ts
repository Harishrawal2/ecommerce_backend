import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ValidationError } from '../utils/appError';
import { validateOrder } from '../validations/orderValidation';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '../services/emailService';

const prisma = new PrismaClient();

// Create new order
export const createOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Validate input
  const validationResult = validateOrder(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { shippingAddress, paymentMethod } = validationResult.data;

  // Get user's cart
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return next(new ValidationError('Cart is empty'));
  }

  // Check if all items are in stock
  for (const item of cart.items) {
    if (item.quantity > item.product.stock) {
      return next(
        new ValidationError(
          `${item.product.title} has only ${item.product.stock} items in stock, but you requested ${item.quantity}`
        )
      );
    }
  }

  // Calculate total amount
  const totalAmount = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Start transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        userId: req.user.id,
        totalAmount,
        shippingAddress,
        paymentMethod,
        status: 'PENDING',
      },
    });

    // Create order items
    for (const item of cart.items) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        },
      });

      // Update product stock
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return newOrder;
  });

  // Get complete order with items
  const completeOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
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
  });

  // Send order confirmation email
  await sendOrderConfirmationEmail(
    req.user.email,
    req.user.name,
    order.id,
    completeOrder
  );

  res.status(201).json({
    status: 'success',
    data: {
      order: completeOrder,
    },
  });
});

// Get all user orders
export const getUserOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: {
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

  const total = await prisma.order.count({
    where: { userId: req.user.id },
  });

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

// Get single order
export const getOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId: req.user.id,
    },
    include: {
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

// Cancel order
export const cancelOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      id,
      userId: req.user.id,
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    return next(new NotFoundError('Order not found'));
  }

  // Check if order can be cancelled
  if (order.status !== 'PENDING' && order.status !== 'PROCESSING') {
    return next(new ValidationError('Order cannot be cancelled at this stage'));
  }

  // Update order status
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Update order status to cancelled
    const cancelled = await tx.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    // Return stock to inventory
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

    return cancelled;
  });

  // Send order status update email
  await sendOrderStatusUpdateEmail(
    req.user.email,
    req.user.name,
    id,
    'CANCELLED'
  );

  res.status(200).json({
    status: 'success',
    data: {
      order: updatedOrder,
      message: 'Order cancelled successfully',
    },
  });
});