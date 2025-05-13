import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cartController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.patch('/items/:id', updateCartItem);
router.delete('/items/:id', removeFromCart);
router.delete('/', clearCart);

export default router;