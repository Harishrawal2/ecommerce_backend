import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, NotFoundError } from '../utils/appError';
import { validateUpdateUser, validateAddress } from '../validations/userValidation';

const prisma = new PrismaClient();

// Get user profile
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      addresses: true,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Update user profile
export const updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Validate input
  const validationResult = validateUpdateUser(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { name, email, password } = validationResult.data;

  // Prepare update data
  const updateData: any = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (password) updateData.password = await bcrypt.hash(password, 12);

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// Get user addresses
export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user.id },
  });

  res.status(200).json({
    status: 'success',
    results: addresses.length,
    data: {
      addresses,
    },
  });
});

// Add new address
export const addAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Validate input
  const validationResult = validateAddress(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { street, city, state, postalCode, country, isDefault } = validationResult.data;

  // If new address is default, update all other addresses to non-default
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.user.id },
      data: { isDefault: false },
    });
  }

  // Create new address
  const newAddress = await prisma.address.create({
    data: {
      street,
      city,
      state,
      postalCode,
      country,
      isDefault: isDefault || false,
      userId: req.user.id,
    },
  });

  res.status(201).json({
    status: 'success',
    data: {
      address: newAddress,
    },
  });
});

// Update address
export const updateAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Check if address exists and belongs to user
  const address = await prisma.address.findFirst({
    where: {
      id,
      userId: req.user.id,
    },
  });

  if (!address) {
    return next(new NotFoundError('Address not found'));
  }

  // Validate input
  const validationResult = validateAddress(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { street, city, state, postalCode, country, isDefault } = validationResult.data;

  // If updated address is default, update all other addresses to non-default
  if (isDefault) {
    await prisma.address.updateMany({
      where: {
        userId: req.user.id,
        id: { not: id },
      },
      data: { isDefault: false },
    });
  }

  // Update address
  const updatedAddress = await prisma.address.update({
    where: { id },
    data: {
      street,
      city,
      state,
      postalCode,
      country,
      isDefault: isDefault || false,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      address: updatedAddress,
    },
  });
});

// Delete address
export const deleteAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Check if address exists and belongs to user
  const address = await prisma.address.findFirst({
    where: {
      id,
      userId: req.user.id,
    },
  });

  if (!address) {
    return next(new NotFoundError('Address not found'));
  }

  // Delete address
  await prisma.address.delete({
    where: { id },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get user orders
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
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
  });

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});