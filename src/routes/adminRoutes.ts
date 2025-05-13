import express from 'express';
import {
  getAllUsers,
  getUser,
  getAllOrders,
  getOrder,
  updateOrderStatus,
  getDashboardStats,
} from '../controllers/adminController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = express.Router();

// Apply protect and admin restriction middleware to all routes
router.use(protect);
router.use(restrictTo('ADMIN'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUser);

// Orders routes
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrder);
router.patch('/orders/:id/status', updateOrderStatus);

export default router;