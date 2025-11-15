import { Keyboard } from '@maxhub/max-bot-api';
import { addTask, getTasks, getTask, completeTask, deleteTask, getCompletedTasks, getUserStats, clearCompletedTasks } from '../db.js';
import { safeCallbackHandler, isFreshMessage, getPriorityEmoji, getPriorityText, formatDate, isOverdue, truncate } from '../utils.js';
import { stateManager } from '../stateManager.js';

/**
 * Handle /task command - start task creation
 */
export function handleTaskCommand(ctx: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    const userId = ctx.user?.user_id;
    if (!userId) return ctx.reply('Ошибка: не удалось определить пользователя.');

    // Reset user state
    stateManager.setUserState(userId, {
        step: 'title',
        tempTask: {}
    });

    const keyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.callback('❌ Отменить', 'task:cancel')]
    ]);

    return ctx.reply(
        '📝 Давайте создадим новую задачу!\n\n**Введите название задачи:**\n\n_Для отмены введите /quit или нажмите кнопку "Отменить"_',
        {
            format: 'markdown',
            attachments: [keyboard]
        }
    );
}

/**
 * Handle task creation callback
 */
export const handleTaskCreate = safeCallbackHandler((ctx: any) => {
    return handleTaskCommand(ctx);
});

/**
 * Handle task cancellation
 */
export const handleTaskCancel = safeCallbackHandler((ctx: any) => {
    const userId = ctx.user?.user_id;
    if (!userId) {
        return ctx.answerOnCallback({
            notification: 'Ошибка: пользователь не найден'
        });
    }

    stateManager.deleteUserState(userId);

    return ctx.answerOnCallback({
        message: {
            text: '❌ **Создание задачи отменено**',
            format: 'markdown'
        }
    });
});

/**
 * Handle task input during creation flow
 */
export async function handleTaskInput(ctx: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    const userId = ctx.user?.user_id;
    if (!userId || !stateManager.hasUserState(userId)) return;

    const state = stateManager.getUserState(userId)!;
    const messageText = ctx.message?.body?.text?.trim();

    if (!messageText) return;

    // Check for quit command
    if (messageText.toLowerCase() === '/quit') {
        stateManager.deleteUserState(userId);
        return ctx.reply('❌ **Создание задачи отменено**', { format: 'markdown' });
    }

    switch (state.step) {
        case 'title':
            state.tempTask.title = messageText;
            state.step = 'description';
            stateManager.setUserState(userId, state);

            const descriptionKeyboard = Keyboard.inlineKeyboard([
                [Keyboard.button.callback('❌ Отменить', 'task:cancel')]
            ]);

            return ctx.reply(
                '📋 **Отлично! Теперь введите описание задачи:**\n\n_Для отмены введите /quit или нажмите кнопку "Отменить"_',
                {
                    format: 'markdown',
                    attachments: [descriptionKeyboard]
                }
            );

        case 'description':
            state.tempTask.description = messageText;
            state.step = 'priority';
            stateManager.setUserState(userId, state);

            const priorityKeyboard = Keyboard.inlineKeyboard([
                [
                    Keyboard.button.callback('🔴 Высокий', 'priority:high'),
                    Keyboard.button.callback('🟡 Средний', 'priority:medium'),
                ],
                [
                    Keyboard.button.callback('🟢 Низкий', 'priority:low'),
                ],
                [
                    Keyboard.button.callback('❌ Отменить', 'task:cancel'),
                ]
            ]);

            return ctx.reply(
                '🎯 **Выберите приоритет задачи:**',
                {
                    format: 'markdown',
                    attachments: [priorityKeyboard]
                }
            );

        case 'deadline_hours':
            return handleCustomHoursInput(ctx, userId, state, messageText);

        case 'deadline_date':
            return handleCustomDateInput(ctx, userId, state, messageText);

        default:
            return;
    }
}

/**
 * Handle priority selection
 */
export const handlePrioritySelection = safeCallbackHandler((ctx: any) => {
    const userId = ctx.user?.user_id;
    if (!userId) {
        return ctx.answerOnCallback({
            notification: 'Ошибка: пользователь не найден'
        });
    }

    const state = stateManager.getUserState(userId);
    if (!state) {
        return ctx.answerOnCallback({
            notification: 'Сессия истекла. Начните добавление задачи заново.'
        });
    }

    const priority = ctx.match![1]; // 'high', 'medium', 'low'
    state.tempTask.priority = priority;
    state.step = 'deadline';
    stateManager.setUserState(userId, state);

    const deadlineKeyboard = Keyboard.inlineKeyboard([
        [
            Keyboard.button.callback('Сегодня', 'deadline:today'),
            Keyboard.button.callback('Завтра', 'deadline:tomorrow'),
        ],
        [
            Keyboard.button.callback('Через 3 дня', 'deadline:3days'),
            Keyboard.button.callback('Через неделю', 'deadline:week'),
        ],
        [
            Keyboard.button.callback('⏰ Задать в часах', 'deadline:custom_hours'),
            Keyboard.button.callback('📅 Задать датой', 'deadline:custom_date'),
        ],
        [
            Keyboard.button.callback('Без дедлайна', 'deadline:none'),
        ],
        [
            Keyboard.button.callback('❌ Отменить', 'task:cancel'),
        ]
    ]);

    const priorityEmoji = getPriorityEmoji(priority);
    const priorityText = getPriorityText(priority);

    return ctx.answerOnCallback({
        message: {
            text: `${priorityEmoji} **Приоритет установлен: ${priorityText}**\n\n⏰ **Теперь выберите дедлайн для задачи:**`,
            format: 'markdown',
            attachments: [deadlineKeyboard]
        }
    });
});

/**
 * Handle custom hours input
 */
async function handleCustomHoursInput(ctx: any, userId: number, state: any, messageText: string) {
    if (messageText.toLowerCase() === '/quit') {
        stateManager.deleteUserState(userId);
        return ctx.reply('❌ **Создание задачи отменено**', { format: 'markdown' });
    }

    const hours = parseInt(messageText, 10);

    if (isNaN(hours) || hours <= 0) {
        const keyboard = Keyboard.inlineKeyboard([
            [Keyboard.button.callback('❌ Отменить', 'task:cancel')]
        ]);

        return ctx.reply(
            '❌ **Неверный формат!** Пожалуйста, введите целое положительное число (количество часов):\n\n_Для отмены введите /quit_',
            {
                format: 'markdown',
                attachments: [keyboard]
            }
        );
    }

    try {
        // Create deadline in UTC to avoid timezone issues
        const deadline = new Date();
        deadline.setUTCHours(deadline.getUTCHours() + hours);

        if (isNaN(deadline.getTime())) {
            throw new Error('Invalid date');
        }

        const deadlineString = deadline.toISOString();
        await saveTaskWithDeadline(ctx, userId, state, deadlineString, `через ${hours} часов`);
        stateManager.deleteUserState(userId);
    } catch (error) {
        console.error('Error processing hours input:', error);

        const keyboard = Keyboard.inlineKeyboard([
            [Keyboard.button.callback('❌ Отменить', 'task:cancel')]
        ]);

        return ctx.reply(
            '❌ **Произошла ошибка!** Пожалуйста, введите корректное количество часов:\n\n_Для отмены введите /quit_',
            {
                format: 'markdown',
                attachments: [keyboard]
            }
        );
    }
}

/**
 * Handle custom date input
 */
async function handleCustomDateInput(ctx: any, userId: number, state: any, messageText: string) {
    if (messageText.toLowerCase() === '/quit') {
        stateManager.deleteUserState(userId);
        return ctx.reply('❌ **Создание задачи отменено**', { format: 'markdown' });
    }

    try {
        let date: Date | null = null;
        let isValidFormat = false;

        if (/^\d{4}-\d{2}-\d{2}$/.test(messageText)) {
            // Parse date and set to end of day in UTC
            date = new Date(messageText + 'T00:00:00Z');
            date.setUTCHours(23, 59, 59, 999);
            isValidFormat = true;
        } else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(messageText)) {
            const [day, month, year] = messageText.split('.');
            // Parse date and set to end of day in UTC
            date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
            date.setUTCHours(23, 59, 59, 999);
            isValidFormat = true;
        }

        if (!isValidFormat || !date || isNaN(date.getTime())) {
            const keyboard = Keyboard.inlineKeyboard([
                [Keyboard.button.callback('❌ Отменить', 'task:cancel')]
            ]);

            return ctx.reply(
                '❌ **Неверный формат даты!**\n\nИспользуйте формат:\n• `ГГГГ-ММ-ДД` (например: 2024-12-31)\n• `ДД.ММ.ГГГГ` (например: 31.12.2024)\n\n_Для отмены введите /quit_',
                {
                    format: 'markdown',
                    attachments: [keyboard]
                }
            );
        }

        if (date <= new Date()) {
            const keyboard = Keyboard.inlineKeyboard([
                [Keyboard.button.callback('❌ Отменить', 'task:cancel')]
            ]);

            return ctx.reply(
                '❌ **Дата должна быть в будущем!** Пожалуйста, введите корректную дату:\n\n_Для отмены введите /quit_',
                {
                    format: 'markdown',
                    attachments: [keyboard]
                }
            );
        }

        const deadlineString = date.toISOString();
        const displayDate = messageText.includes('-') ? messageText : date.toISOString().split('T')[0];

        await saveTaskWithDeadline(ctx, userId, state, deadlineString, displayDate);
        stateManager.deleteUserState(userId);
    } catch (error) {
        console.error('Error processing date input:', error);

        const keyboard = Keyboard.inlineKeyboard([
            [Keyboard.button.callback('❌ Отменить', 'task:cancel')]
        ]);

        return ctx.reply(
            '❌ **Произошла ошибка!** Пожалуйста, введите дату в правильном формате:\n\n_Для отмены введите /quit_',
            {
                format: 'markdown',
                attachments: [keyboard]
            }
        );
    }
}

/**
 * Save task with deadline
 */
async function saveTaskWithDeadline(ctx: any, userId: number, state: any, deadline: string, displayDeadline: string) {
    const priority = state.tempTask.priority || 'medium';
    const priorityEmoji = getPriorityEmoji(priority);
    const priorityText = getPriorityText(priority);

    await addTask(
        userId,
        state.tempTask.title!,
        state.tempTask.description,
        deadline,
        priority
    );

    const deadlineText = deadline
        ? `\n**Дедлайн:** ${displayDeadline}`
        : '\n**Дедлайн:** не задан';
    const priorityInfo = `\n**Приоритет:** ${priorityEmoji} ${priorityText}`;
    const fullText = `✅ **Задача добавлена!**\n\n**Название:** ${state.tempTask.title}${deadlineText}${priorityInfo}`;

    await ctx.reply(fullText, { format: 'markdown' });
}

/**
 * Handle deadline selection
 */
export const handleDeadlineSelection = safeCallbackHandler(async (ctx: any) => {
    const userId = ctx.user?.user_id;
    if (!userId) {
        return ctx.answerOnCallback({
            notification: 'Ошибка: пользователь не найден'
        });
    }

    const state = stateManager.getUserState(userId);
    if (!state) {
        return ctx.answerOnCallback({
            notification: 'Сессия истекла. Начните добавление задачи заново.'
        });
    }

    const deadlineType = ctx.match![1];

    if (deadlineType === 'custom_hours') {
        state.step = 'deadline_hours';
        stateManager.setUserState(userId, state);

        const keyboard = Keyboard.inlineKeyboard([
            [Keyboard.button.callback('❌ Отменить', 'task:cancel')]
        ]);

        return ctx.answerOnCallback({
            message: {
                text: '⏰ **Укажите дедлайн в часах**\n\nВведите количество часов:\n\n_Для отмены введите /quit_',
                format: 'markdown',
                attachments: [keyboard]
            }
        });
    }

    if (deadlineType === 'custom_date') {
        state.step = 'deadline_date';
        stateManager.setUserState(userId, state);

        const keyboard = Keyboard.inlineKeyboard([
            [Keyboard.button.callback('❌ Отменить', 'task:cancel')]
        ]);

        return ctx.answerOnCallback({
            message: {
                text: '📅 **Укажите дату дедлайна**\n\nВведите дату в формате:\n• `ГГГГ-ММ-ДД` (например: 2024-12-31)\n• `ДД.ММ.ГГГГ` (например: 31.12.2024)\n\n_Для отмены введите /quit_',
                format: 'markdown',
                attachments: [keyboard]
            }
        });
    }

    let deadline: string | undefined;
    const now = new Date();

    switch (deadlineType) {
        case 'today':
            // Set to end of today in UTC
            now.setUTCHours(23, 59, 59, 999);
            deadline = now.toISOString();
            break;
        case 'tomorrow':
            // Set to end of tomorrow in UTC
            now.setUTCDate(now.getUTCDate() + 1);
            now.setUTCHours(23, 59, 59, 999);
            deadline = now.toISOString();
            break;
        case '3days':
            // Set to end of day in 3 days in UTC
            now.setUTCDate(now.getUTCDate() + 3);
            now.setUTCHours(23, 59, 59, 999);
            deadline = now.toISOString();
            break;
        case 'week':
            // Set to end of day in 7 days in UTC
            now.setUTCDate(now.getUTCDate() + 7);
            now.setUTCHours(23, 59, 59, 999);
            deadline = now.toISOString();
            break;
        case 'none':
            deadline = undefined;
            break;
    }

    const priority = state.tempTask.priority || 'medium';
    const priorityEmoji = getPriorityEmoji(priority);
    const priorityText = getPriorityText(priority);

    await addTask(
        userId,
        state.tempTask.title!,
        state.tempTask.description,
        deadline,
        priority
    );

    stateManager.deleteUserState(userId);

    const deadlineText = deadline
        ? `\n**Дедлайн:** ${formatDate(deadline)}`
        : '\n**Дедлайн:** не задан';
    const priorityInfo = `\n**Приоритет:** ${priorityEmoji} ${priorityText}`;
    const fullText = `✅ **Задача добавлена!**\n\n**Название:** ${state.tempTask.title}${deadlineText}${priorityInfo}`;

    ctx.reply(fullText, { format: 'markdown' });

    return ctx.answerOnCallback({
        notification: 'Задача сохранена!'
    });
});

/**
 * Handle /tasks command - list tasks
 */
export async function handleTasksCommand(ctx: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    const userId = ctx.user?.user_id;
    if (!userId) return ctx.reply('Ошибка: не удалось определить пользователя.');

    const tasks = await getTasks(userId);

    if (tasks.length === 0) {
        const keyboard = Keyboard.inlineKeyboard([
            [Keyboard.button.callback('➕ Создать задачу', 'task:create')],
            [Keyboard.button.callback('⬅️ Главное меню', 'menu:main')]
        ]);

        return ctx.reply(
            '📋 **У вас пока нет активных задач**\n\nСоздайте новую задачу, чтобы начать!',
            {
                format: 'markdown',
                attachments: [keyboard]
            }
        );
    }

    let message = `📋 **Ваши задачи (${tasks.length}):**\n\n`;

    const buttons: any[] = [];
    tasks.slice(0, 10).forEach((task, index) => {
        const priorityEmoji = getPriorityEmoji(task.priority);
        const overdueEmoji = task.deadline && isOverdue(task.deadline) ? '⚠️ ' : '';
        const title = truncate(task.title, 30);

        message += `${index + 1}. ${priorityEmoji} ${overdueEmoji}${title}\n`;
        // Use UUID directly in callback data
        buttons.push([Keyboard.button.callback(`${index + 1}. ${title}`, `task:view:${task.id}`)]);
    });

    buttons.push([Keyboard.button.callback('➕ Создать задачу', 'task:create')]);
    buttons.push([Keyboard.button.callback('📊 Статистика', 'stats:show')]);
    buttons.push([Keyboard.button.callback('⬅️ Главное меню', 'menu:main')]);

    const keyboard = Keyboard.inlineKeyboard(buttons);

    return ctx.reply(message, {
        format: 'markdown',
        attachments: [keyboard]
    });
}

/**
 * Handle task list callback
 */
export const handleTasksList = safeCallbackHandler(async (ctx: any) => {
    return handleTasksCommand(ctx);
});

/**
 * Handle task view
 */
export const handleTaskView = safeCallbackHandler(async (ctx: any) => {
    const userId = ctx.user?.user_id;
    if (!userId) {
        return ctx.answerOnCallback({
            notification: 'Ошибка: пользователь не найден'
        });
    }

    const taskId = ctx.match![1];  // UUID string
    const task = await getTask(taskId, userId);

    if (!task) {
        return ctx.answerOnCallback({
            notification: 'Задача не найдена'
        });
    }

    const priorityEmoji = getPriorityEmoji(task.priority);
    const priorityText = getPriorityText(task.priority);
    const overdueText = task.deadline && isOverdue(task.deadline) ? '\n⚠️ **ПРОСРОЧЕНО!**' : '';

    // Show short ID for display (first 8 chars of UUID)
    const shortId = task.id.substring(0, 8);
    let message = `📋 **Задача #${shortId}**\n\n`;
    message += `**Название:** ${task.title}\n`;
    message += `**Описание:** ${task.description || 'Не указано'}\n`;
    message += `**Приоритет:** ${priorityEmoji} ${priorityText}\n`;
    message += `**Дедлайн:** ${task.deadline ? formatDate(task.deadline) : 'Не задан'}${overdueText}\n`;
    message += `**Создано:** ${formatDate(task.created_at)}`;

    const keyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.callback('✅ Выполнено', `task:complete:${task.id}`)],
        [Keyboard.button.callback('🗑️ Удалить', `task:delete:${task.id}`)],
        [Keyboard.button.callback('⬅️ К списку задач', 'tasks:list')]
    ]);

    return ctx.answerOnCallback({
        message: {
            text: message,
            format: 'markdown',
            attachments: [keyboard]
        }
    });
});

/**
 * Handle task completion
 */
export const handleTaskComplete = safeCallbackHandler(async (ctx: any) => {
    const userId = ctx.user?.user_id;
    if (!userId) {
        return ctx.answerOnCallback({
            notification: 'Ошибка: пользователь не найден'
        });
    }

    const taskId = ctx.match![1];  // UUID string
    const success = await completeTask(taskId, userId);

    if (success) {
        return ctx.answerOnCallback({
            message: {
                text: '✅ **Задача выполнена!**\n\nОтличная работа! 🎉',
                format: 'markdown'
            },
            notification: 'Задача выполнена!'
        });
    } else {
        return ctx.answerOnCallback({
            notification: 'Не удалось выполнить задачу'
        });
    }
});

/**
 * Handle task deletion
 */
export const handleTaskDelete = safeCallbackHandler(async (ctx: any) => {
    const userId = ctx.user?.user_id;
    if (!userId) {
        return ctx.answerOnCallback({
            notification: 'Ошибка: пользователь не найден'
        });
    }

    const taskId = ctx.match![1];  // UUID string
    const success = await deleteTask(taskId, userId);

    if (success) {
        return ctx.answerOnCallback({
            message: {
                text: '🗑️ **Задача удалена**',
                format: 'markdown'
            },
            notification: 'Задача удалена'
        });
    } else {
        return ctx.answerOnCallback({
            notification: 'Не удалось удалить задачу'
        });
    }
});

/**
 * Handle /stats command
 */
export async function handleStatsCommand(ctx: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    const userId = ctx.user?.user_id;
    if (!userId) return ctx.reply('Ошибка: не удалось определить пользователя.');

    const stats = await getUserStats(userId, 7);

    let message = `📊 **Ваша статистика за 7 дней:**\n\n`;
    message += `📝 Всего задач: ${stats.total}\n`;
    message += `✅ Выполнено: ${stats.completed}\n`;
    message += `⏳ В работе: ${stats.pending}\n`;
    message += `⚠️ Просрочено: ${stats.overdue}\n\n`;
    message += `**По приоритетам:**\n`;
    message += `🔴 Высокий: ${stats.byPriority.high}\n`;
    message += `🟡 Средний: ${stats.byPriority.medium}\n`;
    message += `🟢 Низкий: ${stats.byPriority.low}\n\n`;
    message += `**Выполнено:**\n`;
    message += `📅 Сегодня: ${stats.completedToday}\n`;
    message += `📆 За неделю: ${stats.completedThisWeek}`;

    const keyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.callback('📋 Мои задачи', 'tasks:list')],
        [Keyboard.button.callback('🗑️ Очистить выполненные', 'stats:clear')],
        [Keyboard.button.callback('⬅️ Главное меню', 'menu:main')]
    ]);

    return ctx.reply(message, {
        format: 'markdown',
        attachments: [keyboard]
    });
}

/**
 * Handle stats show callback
 */
export const handleStatsShow = safeCallbackHandler(async (ctx: any) => {
    return handleStatsCommand(ctx);
});

/**
 * Handle clear completed tasks
 */
export const handleStatsClear = safeCallbackHandler(async (ctx: any) => {
    const userId = ctx.user?.user_id;
    if (!userId) {
        return ctx.answerOnCallback({
            notification: 'Ошибка: пользователь не найден'
        });
    }

    const count = await clearCompletedTasks(userId);

    return ctx.answerOnCallback({
        message: {
            text: `🗑️ **Очищено выполненных задач: ${count}**`,
            format: 'markdown'
        },
        notification: `Удалено ${count} задач`
    });
});