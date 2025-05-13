import express from 'express';
import {
  register,
  login,
  getCurrentUser,
  logout,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logout);

export default router;