import { query } from './config/database.js';
import { Task, TaskStats } from './types.js';

/**
 * Database operations for tasks
 * Updated to match server schema with UUID and proper field structure
 */

/**
 * Add a new task
 */
export async function addTask(
    userId: number,
    title: string,
    description?: string,
    deadline?: string,
    priority: string = 'medium'
): Promise<string | null> {
    console.log(`💾 Adding task for user ${userId}, priority: ${priority}`);

    const result = await query(
        `INSERT INTO tasks (user_id, title, description, deadline, priority, completed, tags, subtasks, call_link, attachments)
         VALUES ($1, $2, $3, $4, $5, false, '{}', '[]', '', '{}')
         RETURNING id`,
        [userId, title, description || '', deadline || null, priority]
    );

    if (result && result.rows.length > 0) {
        const taskId = result.rows[0].id;
        console.log(`✅ Task added with ID: ${taskId}`);
        return taskId;
    }

    return null;
}

/**
 * Get all active (not completed) tasks for a user
 */
export async function getTasks(userId: number): Promise<Task[]> {
    console.log(`🔍 Getting active tasks for user ${userId}`);

    const result = await query<Task>(
        `SELECT * FROM tasks 
         WHERE user_id = $1 AND completed = false 
         ORDER BY 
           CASE priority 
             WHEN 'high' THEN 1 
             WHEN 'medium' THEN 2 
             WHEN 'low' THEN 3 
             ELSE 4 
           END,
           created_at DESC`,
        [userId]
    );

    const tasks = result?.rows || [];
    console.log(`📊 Found ${tasks.length} active tasks`);
    return tasks;
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string, userId: number): Promise<Task | null> {
    console.log(`🔍 Getting task ${taskId} for user ${userId}`);

    const result = await query<Task>(
        'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
        [taskId, userId]
    );

    return result?.rows[0] || null;
}

/**
 * Complete a task
 */
export async function completeTask(taskId: string, userId: number): Promise<boolean> {
    console.log(`✅ Completing task ${taskId} for user ${userId}`);

    const result = await query(
        `UPDATE tasks 
         SET completed = true, completed_at = NOW() 
         WHERE id = $1 AND user_id = $2 AND completed = false
         RETURNING id`,
        [taskId, userId]
    );

    const success = !!(result && result.rows.length > 0);
    if (success) {
        console.log(`✅ Task ${taskId} marked as completed`);
    } else {
        console.log(`⚠️ Task ${taskId} not found or already completed`);
    }

    return success;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string, userId: number): Promise<boolean> {
    console.log(`🗑️ Deleting task ${taskId} for user ${userId}`);

    const result = await query(
        'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
        [taskId, userId]
    );

    const success = !!(result && result.rows.length > 0);
    if (success) {
        console.log(`✅ Task ${taskId} deleted`);
    }

    return success;
}

/**
 * Get completed tasks for a user
 */
export async function getCompletedTasks(userId: number, limit: number = 10): Promise<Task[]> {
    console.log(`🔍 Getting completed tasks for user ${userId}, limit: ${limit}`);

    const result = await query<Task>(
        `SELECT * FROM tasks 
         WHERE user_id = $1 AND completed = true 
         ORDER BY completed_at DESC 
         LIMIT $2`,
        [userId, limit]
    );

    const tasks = result?.rows || [];
    console.log(`📊 Found ${tasks.length} completed tasks`);
    return tasks;
}

/**
 * Get task statistics for a user
 */
export async function getUserStats(userId: number, days: number = 7): Promise<TaskStats> {
    console.log(`📊 Getting stats for user ${userId} for last ${days} days`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all tasks in period
    const result = await query<Task>(
        `SELECT * FROM tasks 
         WHERE user_id = $1 AND created_at >= $2
         ORDER BY created_at DESC`,
        [userId, startDate.toISOString()]
    );

    const tasks = result?.rows || [];

    const stats: TaskStats = {
        total: tasks.length,
        completed: 0,
        pending: 0,
        overdue: 0,
        completedToday: 0,
        completedThisWeek: 0,
        byPriority: {
            high: 0,
            medium: 0,
            low: 0
        }
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    tasks.forEach(task => {
        // Count by status
        if (task.completed) {
            stats.completed++;

            // Count completed today/this week
            if (task.completed_at) {
                const completedDate = new Date(task.completed_at);
                if (completedDate >= todayStart) {
                    stats.completedToday++;
                }
                if (completedDate >= weekStart) {
                    stats.completedThisWeek++;
                }
            }
        } else {
            stats.pending++;

            // Check if overdue
            if (task.deadline && new Date(task.deadline) < now) {
                stats.overdue++;
            }
        }

        // Count by priority
        if (task.priority === 'high') {
            stats.byPriority.high++;
        } else if (task.priority === 'medium') {
            stats.byPriority.medium++;
        } else if (task.priority === 'low') {
            stats.byPriority.low++;
        }
    });

    console.log(`📊 Stats: ${stats.total} total, ${stats.completed} completed, ${stats.pending} pending`);
    return stats;
}

/**
 * Clear completed tasks
 */
export async function clearCompletedTasks(userId: number): Promise<number> {
    console.log(`🧹 Clearing completed tasks for user ${userId}`);

    const result = await query(
        'DELETE FROM tasks WHERE user_id = $1 AND completed = true RETURNING id',
        [userId]
    );

    const count = result?.rows.length || 0;
    console.log(`✅ Deleted ${count} completed tasks`);
    return count;
}

/**
 * Get user by MAX user ID (for bot integration)
 */
export async function getUserByMaxId(maxUserId: number): Promise<any> {
    const result = await query(
        'SELECT * FROM users WHERE max_user_id = $1',
        [maxUserId]
    );

    return result?.rows[0] || null;
}