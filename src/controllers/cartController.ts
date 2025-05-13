import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ValidationError } from '../utils/appError';
import { validateCartItem } from '../validations/cartValidation';

const prisma = new PrismaClient();

// Get cart
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              images: true,
              stock: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    // Create cart if it doesn't exist
    const newCart = await prisma.cart.create({
      data: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                images: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        cart: newCart,
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      cart,
    },
  });
});

// Add item to cart
export const addToCart = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Validate input
  const validationResult = validateCartItem(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { productId, quantity } = validationResult.data;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return next(new NotFoundError('Product not found'));
  }

  // Check if quantity is valid
  if (quantity > product.stock) {
    return next(new ValidationError(`Not enough stock. Only ${product.stock} available.`));
  }

  // Get or create cart
  let cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId: req.user.id },
    });
  }

  // Check if item already exists in cart
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  if (existingItem) {
    // Update existing item
    const newQuantity = existingItem.quantity + quantity;
    
    // Check if new quantity is valid
    if (newQuantity > product.stock) {
      return next(new ValidationError(`Cannot add more. Only ${product.stock} available.`));
    }
    
    const updatedItem = await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQuantity,
        price: product.price, // Update price in case it changed
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
          },
        },
      },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                images: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        cart: updatedCart,
        message: 'Item quantity updated in cart',
      },
    });
  }

  // Add new item to cart
  const newItem = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId,
      quantity,
      price: product.price,
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
        },
      },
    },
  });

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              images: true,
              stock: true,
            },
          },
        },
      },
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      cart: updatedCart,
      message: 'Item added to cart',
    },
  });
});

// Update cart item
export const updateCartItem = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Validate input
  if (!req.body.quantity) {
    return next(new ValidationError('Quantity is required'));
  }

  const quantity = parseInt(req.body.quantity);
  
  if (isNaN(quantity) || quantity < 1) {
    return next(new ValidationError('Quantity must be a positive number'));
  }

  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
  });

  if (!cart) {
    return next(new NotFoundError('Cart not found'));
  }

  // Check if item exists in cart
  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id,
      cartId: cart.id,
    },
    include: {
      product: true,
    },
  });

  if (!cartItem) {
    return next(new NotFoundError('Item not found in cart'));
  }

  // Check if quantity is valid
  if (quantity > cartItem.product.stock) {
    return next(new ValidationError(`Not enough stock. Only ${cartItem.product.stock} available.`));
  }

  // Update cart item
  const updatedItem = await prisma.cartItem.update({
    where: { id },
    data: {
      quantity,
    },
  });

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              images: true,
              stock: true,
            },
          },
        },
      },
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      cart: updatedCart,
      message: 'Item quantity updated',
    },
  });
});

// Remove item from cart
export const removeFromCart = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
  });

  if (!cart) {
    return next(new NotFoundError('Cart not found'));
  }

  // Check if item exists in cart
  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id,
      cartId: cart.id,
    },
  });

  if (!cartItem) {
    return next(new NotFoundError('Item not found in cart'));
  }

  // Remove item from cart
  await prisma.cartItem.delete({
    where: { id },
  });

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              images: true,
              stock: true,
            },
          },
        },
      },
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      cart: updatedCart,
      message: 'Item removed from cart',
    },
  });
});

// Clear cart
export const clearCart = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
  });

  if (!cart) {
    return next(new NotFoundError('Cart not found'));
  }

  // Remove all items from cart
  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
    },
  });

  const emptyCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: true,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      cart: emptyCart,
      message: 'Cart cleared',
    },
  });
});