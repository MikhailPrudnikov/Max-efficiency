import { Request, Response } from 'express';
import { query } from '../config/database.js';

export const getTasks = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ getTasks: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const result = await query(
            'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        // Always return an object with tasks array, even if empty
        const tasks = result?.rows || [];
        console.log(`✅ getTasks: Returning ${tasks.length} tasks for user ${userId}`);
        res.json({ tasks });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks', tasks: [] });
    }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ createTask: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { title, description, deadline, priority, tags, subtasks, call_link, attachments } = req.body;

        const result = await query(
            `INSERT INTO tasks (user_id, title, description, deadline, priority, tags, subtasks, call_link, attachments)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                userId,
                title || '',
                description || '',
                deadline || null,
                priority || 'medium',
                tags || [],
                JSON.stringify(subtasks || []),
                call_link || '',
                attachments || []
            ]
        );

        res.json({ task: result?.rows[0] || null });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ updateTask: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { title, description, deadline, priority, tags, subtasks, call_link, attachments, completed } = req.body;

        // Get current task to check if completed status is changing
        const currentTaskResult = await query(
            'SELECT completed FROM tasks WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (!currentTaskResult || currentTaskResult.rows.length === 0) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const currentTask = currentTaskResult.rows[0];
        const isCompletingNow = completed && !currentTask.completed;

        const result = await query(
            `UPDATE tasks
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 deadline = $3,
                 priority = COALESCE($4, priority),
                 tags = COALESCE($5, tags),
                 subtasks = COALESCE($6, subtasks),
                 call_link = COALESCE($7, call_link),
                 attachments = COALESCE($8, attachments),
                 completed = COALESCE($9, completed),
                 completed_at = CASE
                     WHEN $9 = true AND completed = false THEN now()
                     WHEN $9 = false THEN NULL
                     ELSE completed_at
                 END
             WHERE id = $10 AND user_id = $11
             RETURNING *`,
            [title, description, deadline, priority, tags, JSON.stringify(subtasks), call_link, attachments, completed, id, userId]
        );

        if (!result || result.rows.length === 0) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        res.json({ task: result.rows[0] });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ deleteTask: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        const result = await query(
            'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );

        if (!result || result.rows.length === 0) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
};

export const searchTasks = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ searchTasks: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { query: searchQuery } = req.query;

        if (!searchQuery || typeof searchQuery !== 'string') {
            res.status(400).json({ error: 'Search query is required' });
            return;
        }

        const searchPattern = `%${searchQuery.toLowerCase()}%`;

        // Search in tasks by title, description, and tags
        const result = await query(
            `SELECT * FROM tasks
             WHERE user_id = $1
             AND (
               LOWER(title) LIKE $2
               OR LOWER(description) LIKE $2
               OR EXISTS (
                 SELECT 1 FROM unnest(tags) AS tag
                 WHERE LOWER(tag) LIKE $2
               )
             )
             ORDER BY created_at DESC`,
            [userId, searchPattern]
        );

        const tasks = result?.rows || [];
        console.log(`✅ searchTasks: Found ${tasks.length} tasks for query "${searchQuery}"`);
        res.json({ tasks });
    } catch (error) {
        console.error('Search tasks error:', error);
        res.status(500).json({ error: 'Failed to search tasks', tasks: [] });
    }
};
