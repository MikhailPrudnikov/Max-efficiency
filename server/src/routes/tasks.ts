import { Router } from 'express';
import { getTasks, createTask, updateTask, deleteTask, searchTasks } from '../controllers/tasksController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/search', searchTasks);
router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
