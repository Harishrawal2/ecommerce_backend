import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticationError } from '../utils/appError';
import { asyncHandler } from '../utils/asyncHandler';

const prisma = new PrismaClient();

interface JwtPayload {
  id: string;
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // 1) Get token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AuthenticationError('You are not logged in! Please log in to get access.')
    );
  }

  // 2) Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

  // 3) Check if user still exists
  const currentUser = await prisma.user.findUnique({
    where: {
      id: decoded.id,
    },
  });

  if (!currentUser) {
    return next(
      new AuthenticationError('The user belonging to this token no longer exists.')
    );
  }

  // 4) Grant access to protected route
  req.user = currentUser;
  next();
});

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AuthenticationError('You do not have permission to perform this action')
      );
    }
    next();
  };
};