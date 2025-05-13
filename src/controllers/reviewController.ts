import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/appError';
import { validateReview } from '../validations/reviewValidation';

const prisma = new PrismaClient();

// Add review
export const addReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { productId } = req.params;

  // Validate input
  const validationResult = validateReview(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { rating, comment } = validationResult.data;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return next(new NotFoundError('Product not found'));
  }

  // Check if user has purchased the product
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId: req.user.id,
        status: {
          in: ['DELIVERED'],
        },
      },
    },
  });

  if (!hasPurchased) {
    return next(new ForbiddenError('You can only review products you have purchased'));
  }

  // Check if user has already reviewed this product
  const existingReview = await prisma.review.findFirst({
    where: {
      userId: req.user.id,
      productId,
    },
  });

  if (existingReview) {
    return next(new ValidationError('You have already reviewed this product'));
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      rating,
      comment,
      userId: req.user.id,
      productId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  res.status(201).json({
    status: 'success',
    data: {
      review,
    },
  });
});

// Update review
export const updateReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Validate input
  const validationResult = validateReview(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { rating, comment } = validationResult.data;

  // Check if review exists and belongs to user
  const review = await prisma.review.findFirst({
    where: {
      id,
      userId: req.user.id,
    },
  });

  if (!review) {
    return next(new NotFoundError('Review not found or not authorized'));
  }

  // Update review
  const updatedReview = await prisma.review.update({
    where: { id },
    data: {
      rating,
      comment,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      review: updatedReview,
    },
  });
});

// Delete review
export const deleteReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Check if review exists and belongs to user
  const review = await prisma.review.findFirst({
    where: {
      id,
      userId: req.user.id,
    },
  });

  if (!review) {
    return next(new NotFoundError('Review not found or not authorized'));
  }

  // Delete review
  await prisma.review.delete({
    where: { id },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get product reviews
export const getProductReviews = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { productId } = req.params;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return next(new NotFoundError('Product not found'));
  }

  // Get reviews
  const reviews = await prisma.review.findMany({
    where: { productId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});