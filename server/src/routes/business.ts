import { Router } from 'express';
import { getOrders, createOrder, updateOrder, getReviews, createReview } from '../controllers/businessController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/orders', getOrders);
router.post('/orders', createOrder);
router.put('/orders/:id', updateOrder);

router.get('/reviews', getReviews);
router.post('/reviews', createReview);

export default router;
