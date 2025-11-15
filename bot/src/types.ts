/**
 * Type definitions for Max efficiency Bot
 */

// User state for task creation flow
export interface UserState {
    step:
    'title' | 'description' | 'priority' | 'deadline' |
    'deadline_hours' | 'deadline_date';

    tempTask: {
        title?: string;
        description?: string;
        priority?: string;
        deadlineHours?: number;
        deadlineDate?: string;
    };
}

// Task interface matching database schema (server uses UUID for id)
export interface Task {
    id: string;  // UUID
    user_id: number;
    title: string;
    description?: string;
    deadline?: string;
    priority: string;
    tags?: string[];
    subtasks?: string;
    call_link?: string;
    attachments?: string[];
    completed: boolean;
    completed_at?: string;
    created_at: string;
    updated_at: string;
}

// Task statistics
export interface TaskStats {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completedToday: number;
    completedThisWeek: number;
    byPriority: {
        high: number;
        medium: number;
        low: number;
    };
}