import { Keyboard } from '@maxhub/max-bot-api';
import { getGigaChat } from '../services/gigachat.js';
import { addTask, getTasks } from '../db.js';
import { isFreshMessage, getPriorityEmoji, getPriorityText } from '../utils.js';

/**
 * Handle /ai command - start AI assistant conversation
 */
export async function handleAiCommand(ctx: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    const keyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.callback('📝 Создать задачу через AI', 'ai:create_task')],
        [Keyboard.button.callback('❓ Задать вопрос', 'ai:ask')],
        [Keyboard.button.callback('⬅️ Главное меню', 'menu:main')]
    ]);

    return ctx.reply(
        '🤖 **AI Помощник MaxFlow Zen**\n\n' +
        'Я могу помочь вам:\n' +
        '• Создать задачу естественным языком\n' +
        '• Ответить на вопросы о продуктивности\n' +
        '• Дать советы по управлению задачами\n\n' +
        'Просто напишите мне, что вам нужно!',
        {
            format: 'markdown',
            attachments: [keyboard]
        }
    );
}

/**
 * Handle AI task creation callback
 */
export async function handleAiCreateTask(ctx: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    const keyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.callback('❌ Отменить', 'menu:main')]
    ]);

    return ctx.answerOnCallback({
        message: {
            text: '🤖 **Создание задачи через AI**\n\n' +
                'Опишите задачу естественным языком. Например:\n' +
                '• "Создай задачу: позвонить клиенту завтра, высокий приоритет"\n' +
                '• "Нужно подготовить отчет через 3 дня"\n' +
                '• "Купить продукты сегодня вечером"\n\n' +
                'Я автоматически извлеку название, описание, приоритет и дедлайн!',
            format: 'markdown',
            attachments: [keyboard]
        }
    });
}

/**
 * Handle AI question callback
 */
export async function handleAiAsk(ctx: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    const keyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.callback('❌ Отменить', 'menu:main')]
    ]);

    return ctx.answerOnCallback({
        message: {
            text: '❓ **Задайте вопрос AI помощнику**\n\n' +
                'Я могу помочь с:\n' +
                '• Советами по продуктивности\n' +
                '• Методами управления временем\n' +
                '• Приоритизацией задач\n' +
                '• Борьбой с прокрастинацией\n\n' +
                'Просто напишите ваш вопрос!',
            format: 'markdown',
            attachments: [keyboard]
        }
    });
}

/**
 * Process message with AI
 */
export async function handleAiMessage(ctx: any) {
    const userId = ctx.user?.user_id;
    const messageText = ctx.message?.body?.text?.trim();

    if (!userId || !messageText) return;

    // Show typing indicator
    await ctx.reply('🤖 Обрабатываю ваш запрос...');

    try {
        const gigaChat = getGigaChat();

        // First, try to parse as task creation intent
        const taskIntent = await gigaChat.parseTaskIntent(messageText);

        if (taskIntent.isTaskCreation && taskIntent.title) {
            // Create task from AI parsing
            await handleAiTaskCreation(ctx, userId, taskIntent);
        } else {
            // Answer as general question
            await handleAiQuestion(ctx, userId, messageText);
        }
    } catch (error: any) {
        console.error('Error processing AI message:', error);
        return ctx.reply(
            '❌ **Ошибка при обработке запроса**\n\n' +
            'Произошла ошибка при обращении к AI. Попробуйте позже или используйте обычные команды.',
            { format: 'markdown' }
        );
    }
}

/**
 * Handle AI task creation
 */
async function handleAiTaskCreation(ctx: any, userId: number, taskIntent: any) {
    try {
        // Parse deadline
        let deadline: string | undefined;
        if (taskIntent.deadline) {
            deadline = parseDeadlineFromText(taskIntent.deadline);
        }

        // Add task to database
        await addTask(
            userId,
            taskIntent.title,
            taskIntent.description || '',
            deadline,
            taskIntent.priority || 'medium'
        );

        const priorityEmoji = getPriorityEmoji(taskIntent.priority || 'medium');
        const priorityText = getPriorityText(taskIntent.priority || 'medium');

        let message = '✅ **Задача создана через AI!**\n\n';
        message += `**Название:** ${taskIntent.title}\n`;
        if (taskIntent.description) {
            message += `**Описание:** ${taskIntent.description}\n`;
        }
        message += `**Приоритет:** ${priorityEmoji} ${priorityText}\n`;
        if (deadline) {
            message += `**Дедлайн:** ${taskIntent.deadline}\n`;
        }

        const keyboard = Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📋 Мои задачи', 'tasks:list')],
            [Keyboard.button.callback('➕ Создать еще', 'ai:create_task')],
            [Keyboard.button.callback('⬅️ Главное меню', 'menu:main')]
        ]);

        return ctx.reply(message, {
            format: 'markdown',
            attachments: [keyboard]
        });
    } catch (error) {
        console.error('Error creating task from AI:', error);
        return ctx.reply(
            '❌ **Ошибка при создании задачи**\n\n' +
            'Не удалось создать задачу. Попробуйте использовать команду /task для ручного создания.',
            { format: 'markdown' }
        );
    }
}

/**
 * Handle AI question
 */
async function handleAiQuestion(ctx: any, userId: number, question: string) {
    try {
        const gigaChat = getGigaChat();

        // Get user's tasks for context
        const tasks = await getTasks(userId);
        const tasksContext = tasks.length > 0
            ? `У пользователя ${tasks.length} активных задач.`
            : 'У пользователя нет активных задач.';

        const answer = await gigaChat.answerQuestion(question, tasksContext);

        const keyboard = Keyboard.inlineKeyboard([
            [Keyboard.button.callback('❓ Задать еще вопрос', 'ai:ask')],
            [Keyboard.button.callback('📝 Создать задачу', 'ai:create_task')],
            [Keyboard.button.callback('⬅️ Главное меню', 'menu:main')]
        ]);

        return ctx.reply(
            `🤖 **AI Помощник:**\n\n${answer}`,
            {
                format: 'markdown',
                attachments: [keyboard]
            }
        );
    } catch (error) {
        console.error('Error answering question:', error);
        return ctx.reply(
            '❌ **Ошибка при получении ответа**\n\n' +
            'Не удалось получить ответ от AI. Попробуйте позже.',
            { format: 'markdown' }
        );
    }
}

/**
 * Parse deadline from natural language text
 */
function parseDeadlineFromText(deadlineText: string): string | undefined {
    const now = new Date();
    const lowerText = deadlineText.toLowerCase();

    if (lowerText.includes('сегодня')) {
        now.setUTCHours(23, 59, 59, 999);
        return now.toISOString();
    }

    if (lowerText.includes('завтра')) {
        now.setUTCDate(now.getUTCDate() + 1);
        now.setUTCHours(23, 59, 59, 999);
        return now.toISOString();
    }

    // Parse "через N дней/часов"
    const daysMatch = lowerText.match(/через\s+(\d+)\s+(?:день|дня|дней)/);
    if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        now.setUTCDate(now.getUTCDate() + days);
        now.setUTCHours(23, 59, 59, 999);
        return now.toISOString();
    }

    const hoursMatch = lowerText.match(/через\s+(\d+)\s+(?:час|часа|часов)/);
    if (hoursMatch) {
        const hours = parseInt(hoursMatch[1], 10);
        now.setUTCHours(now.getUTCHours() + hours);
        return now.toISOString();
    }

    // Try to parse date formats
    const dateMatch = deadlineText.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        const date = new Date(`${dateMatch[0]}T00:00:00Z`);
        date.setUTCHours(23, 59, 59, 999);
        return date.toISOString();
    }

    return undefined;
}