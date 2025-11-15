import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;
