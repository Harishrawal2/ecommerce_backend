import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ValidationError } from '../utils/appError';
import { validateCategory } from '../validations/categoryValidation';

const prisma = new PrismaClient();

// Get all categories
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

// Get single category with its products
export const getCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          stock: true,
        },
      },
    },
  });

  if (!category) {
    return next(new NotFoundError('Category not found'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

// Create new category (Admin only)
export const createCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Validate input
  const validationResult = validateCategory(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { name, description } = validationResult.data;

  // Check if category already exists
  const existingCategory = await prisma.category.findUnique({
    where: { name },
  });

  if (existingCategory) {
    return next(new ValidationError('Category with this name already exists'));
  }

  // Create category
  const newCategory = await prisma.category.create({
    data: {
      name,
      description,
    },
  });

  res.status(201).json({
    status: 'success',
    data: {
      category: newCategory,
    },
  });
});

// Update category (Admin only)
export const updateCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    return next(new NotFoundError('Category not found'));
  }

  // Validate input
  const validationResult = validateCategory(req.body, true);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { name, description } = validationResult.data;

  // If name is being updated, check for uniqueness
  if (name && name !== category.name) {
    const existingCategory = await prisma.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      return next(new ValidationError('Category with this name already exists'));
    }
  }

  // Update category
  const updatedCategory = await prisma.category.update({
    where: { id },
    data: {
      name: name || category.name,
      description: description !== undefined ? description : category.description,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      category: updatedCategory,
    },
  });
});

// Delete category (Admin only)
export const deleteCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    return next(new NotFoundError('Category not found'));
  }

  // Check if category has products
  const productsCount = await prisma.product.count({
    where: { categoryId: id },
  });

  if (productsCount > 0) {
    return next(new ValidationError('Cannot delete category with associated products'));
  }

  // Delete category
  await prisma.category.delete({
    where: { id },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});