import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOrder,
  cancelOrder,
} from '../controllers/orderController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

router.post('/', createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrder);
router.patch('/:id/cancel', cancelOrder);

export default router;