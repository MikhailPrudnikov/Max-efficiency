/**
 * Utility functions for the bot
 */

/**
 * Check if message is fresh (not old/cached)
 */
export function isFreshMessage(ctx: any, botStartTime: number): boolean {
    const messageTime = ctx.message?.created_at;
    if (!messageTime) return true;

    const messageDate = new Date(messageTime).getTime();
    return messageDate >= botStartTime;
}

/**
 * Create middleware to filter old messages
 */
export function createFreshUpdateMiddleware(getBotStartTime: () => number) {
    return async (ctx: any, next: () => Promise<void>) => {
        if (!isFreshMessage(ctx, getBotStartTime())) {
            console.log(`⏭️ Skipping old message from ${ctx.user?.user_id}`);
            return;
        }
        return next();
    };
}

/**
 * Safe callback handler wrapper
 */
export function safeCallbackHandler(handler: (ctx: any) => any) {
    return async (ctx: any) => {
        try {
            return await handler(ctx);
        } catch (error) {
            console.error('❌ Callback handler error:', error);
            return ctx.answerOnCallback({
                notification: 'Произошла ошибка. Попробуйте еще раз.'
            });
        }
    };
}

/**
 * Get priority emoji
 */
export function getPriorityEmoji(priority: string): string {
    switch (priority) {
        case 'high':
            return '🔴';
        case 'medium':
            return '🟡';
        case 'low':
            return '🟢';
        default:
            return '⚪';
    }
}

/**
 * Get priority text
 */
export function getPriorityText(priority: string): string {
    switch (priority) {
        case 'high':
            return 'Высокий';
        case 'medium':
            return 'Средний';
        case 'low':
            return 'Низкий';
        default:
            return 'Не указан';
    }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

/**
 * Format datetime for display
 */
export function formatDateTime(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
}

/**
 * Check if deadline is overdue
 */
export function isOverdue(deadline: string): boolean {
    try {
        const deadlineDate = new Date(deadline);
        return deadlineDate < new Date();
    } catch {
        return false;
    }
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Escape markdown special characters
 */
export function escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}