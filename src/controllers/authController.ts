import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, AuthenticationError } from '../utils/appError';
import { validateRegister, validateLogin } from '../validations/authValidation';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService';

const prisma = new PrismaClient();

// Generate JWT token
const signToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Create and send token
const createSendToken = (user: any, statusCode: number, res: Response) => {
  const token = signToken(user.id);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// Register new user
export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Validate input
  const validationResult = validateRegister(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { name, email, password } = validationResult.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return next(new ValidationError('Email already in use'));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'CUSTOMER',
    },
  });

  // Create cart for new user
  await prisma.cart.create({
    data: {
      userId: newUser.id,
    },
  });

  // Send welcome email
  await sendWelcomeEmail(email, name);

  createSendToken(newUser, 201, res);
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Validate input
  const validationResult = validateLogin(req.body);
  if (!validationResult.success) {
    return next(new ValidationError(validationResult.error.message));
  }

  const { email, password } = validationResult.data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Check if user exists and password is correct
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AuthenticationError('Incorrect email or password'));
  }

  createSendToken(user, 200, res);
});

// Get current user
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
});

// Forgot password
export const forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return next(new ValidationError('No user found with this email address'));
  }

  // Generate reset token
  const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });

  // Send password reset email
  await sendPasswordResetEmail(email, resetToken);

  res.status(200).json({
    status: 'success',
    message: 'Password reset link sent to email',
  });
});

// Reset password
export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new ValidationError('Please provide token and new password'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: decoded.id },
      data: { password: hashedPassword },
    });

    createSendToken(user, 200, res);
  } catch (error) {
    return next(new ValidationError('Invalid or expired token'));
  }
});

// Logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});