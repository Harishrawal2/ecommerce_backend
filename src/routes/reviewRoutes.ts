import express from 'express';
import {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
} from '../controllers/reviewController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Get product reviews (public)
router.get('/products/:productId', getProductReviews);

// Protected routes
router.use(protect);

router.post('/products/:productId', addReview);
router.patch('/:id', updateReview);
router.delete('/:id', deleteReview);

export default router;