import express from 'express';
import { authenticateMax, updatePhone } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Auth routes for MAX mini-application
 */

// POST /api/auth/max - Authenticate via MAX initData
router.post('/max', authenticateMax);

// POST /api/user/phone - Update user phone (requires authentication)
router.post('/user/phone', authMiddleware, updatePhone);

export default router;