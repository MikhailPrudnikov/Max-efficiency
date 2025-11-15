import { Router } from 'express';
import { getChallenges, createChallenge, updateChallenge } from '../controllers/challengesController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getChallenges);
router.post('/', createChallenge);
router.put('/:id', updateChallenge);

export default router;
