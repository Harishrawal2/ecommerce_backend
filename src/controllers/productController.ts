import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ValidationError } from '../utils/appError';
import { validateProduct } from '../validations/productValidation';

const prisma = new PrismaClient();

// Get all products with pagination and filtering
export const getAllProducts = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const category = req.query.category as string;
  const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
  const search = req.query.search as string;

  // Build filter object
  const filter: any = {};
  
  if (category) {
    const categoryId = await prisma.category.findUnique({
      where: { name: category },
      select: { id: true }
    });
    
    if (categoryId) {
      filter.categoryId = categoryId.id;
    }
  }
  
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.gte = minPrice;
    if (maxPrice !== undefined) filter.price.lte = maxPrice;
  }
  
  if (search) {
    filter.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Get products
  const products = await prisma.product.findMany({
    where: filter,
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      variants: true,
    },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  // Get total count for pagination
  const total = await prisma.product.count({ where: filter });

  res.status(200).json({
    status: 'success',
    results: products.length,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: {
      products,
    },
  });
});

// Get single product
export const getProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: true,
      reviews: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!product) {
    return next(new NotFoundError('Product not found'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product,
    },
  });
});

// Create new product (Admin only)
export const createProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Validate input
  const validationResult = validateProduct(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { title, description, price, categoryId, stock, images, variants } = validationResult.data;

  // Create product
  const newProduct = await prisma.product.create({
    data: {
      title,
      description,
      price,
      categoryId,
      stock,
      images: images || [],
      variants: {
        create: variants || [],
      },
    },
    include: {
      category: true,
      variants: true,
    },
  });

  res.status(201).json({
    status: 'success',
    data: {
      product: newProduct,
    },
  });
});

// Update product (Admin only)
export const updateProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return next(new NotFoundError('Product not found'));
  }

  // Validate input
  const validationResult = validateProduct(req.body, true);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { title, description, price, categoryId, stock, images, variants } = validationResult.data;

  // Prepare update data
  const updateData: any = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (price !== undefined) updateData.price = price;
  if (categoryId) updateData.categoryId = categoryId;
  if (stock !== undefined) updateData.stock = stock;
  if (images) updateData.images = images;

  // Update product
  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      variants: true,
    },
  });

  // Update variants if provided
  if (variants && variants.length > 0) {
    // Delete existing variants
    await prisma.variant.deleteMany({
      where: { productId: id },
    });

    // Create new variants
    await prisma.variant.createMany({
      data: variants.map((variant: any) => ({
        ...variant,
        productId: id,
      })),
    });

    // Fetch updated product with variants
    const productWithVariants = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
      },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        product: productWithVariants,
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      product: updatedProduct,
    },
  });
});

// Delete product (Admin only)
export const deleteProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return next(new NotFoundError('Product not found'));
  }

  // Delete product
  await prisma.product.delete({
    where: { id },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});