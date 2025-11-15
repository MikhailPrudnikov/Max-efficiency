
import { Keyboard } from '@maxhub/max-bot-api';
import { isFreshMessage } from '../utils.js';
import { stateManager } from '../stateManager.js';

/**
 * Handle /start command
 */
export function handleStartCommand(ctx: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    const userId = ctx.user?.user_id || 'unknown';
    console.log(`👋 User ${userId} called /start`);

    const welcomeMessage = `
👋 **Добро пожаловать в Max efficiency!**

Бот для управления задачами и повышения продуктивности.

**Доступные команды:**
- \`/task\` — создать новую задачу
- \`/tasks\` — просмотр задач
- \`/stats\` — статистика выполнения
- \`/focus\` — запустить Pomodoro-таймер (25 минут)
- \`/ai\` — AI помощник (создание задач и вопросы)
- \`/help\` — справка по командам

**Создавайте задачи голосом:**
🎤 Просто отправьте голосовое сообщение, например:
_"Создай задачу: позвонить клиенту завтра, высокий приоритет"_
    `.trim();

    const keyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.callback('📋 Мои задачи', 'tasks:list')],
        [Keyboard.button.callback('➕ Создать задачу', 'task:create')],
        [Keyboard.button.callback('🤖 AI Помощник', 'ai:create_task')],
        [Keyboard.button.callback('📊 Статистика', 'stats:show')],
        [Keyboard.button.callback('🍅 Фокус', 'focus:start')],
        [Keyboard.button.callback('❓ Справка', 'help:show')],
    ]);

    console.log(`✅ Sending welcome menu to user ${userId}`);

    return ctx.reply(welcomeMessage, {
        format: 'markdown',
        attachments: [keyboard],
    });
}

/**
 * Handle /focus command - Pomodoro timer
 */
export function handleFocusCommand(ctx: any, bot: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    console.log(`🍅 User ${ctx.user?.user_id || 'unknown'} called /focus`);

    if (!ctx.user) {
        console.error('❌ Error getting user data in /focus command');
        return ctx.reply('Ошибка получения данных пользователя.');
    }

    const userId = ctx.user.user_id;
    const focusTimeMs = 25 * 60 * 1000; // 25 minutes

    console.log(`⏰ Starting Pomodoro timer for 25 minutes for user ${userId}`);

    ctx.reply('🍅 Поехали! 25 минут фокуса. Не отвлекайся, я напишу, когда время выйдет.');

    setTimeout(() => {
        console.log(`🔔 Pomodoro time is up for user ${userId}, sending notification`);

        bot.api.sendMessageToUser(
            userId,
            '🔔 Дзынь! Время вышло. 5 минут отдыха!'
        ).catch((err: any) => {
            console.error(`❌ Failed to send notification to user ${userId}:`, err);
        });
    }, focusTimeMs);
}

/**
 * Handle unknown commands and messages
 */
export function handleUnknownCommand(ctx: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    const messageText = ctx.message?.body?.text;
    const userId = ctx.user?.user_id;

    if (!messageText || messageText.trim() === '') {
        return;
    }

    if (messageText.startsWith('/')) {
        return;
    }

    if (userId && stateManager.hasUserState(userId)) {
        return;
    }

    console.log(`❓ User ${userId} sent unknown message: "${messageText}"`);

    const helpKeyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.callback('❓ Справка', 'help:show')]
    ]);

    return ctx.reply(
        `❓ **Неизвестная команда**\n\nСписок доступных команд вы можете посмотреть, написав \`/help\` или нажав на кнопку ниже:`,
        {
            format: 'markdown',
            attachments: [helpKeyboard]
        }
    );
}

/**
 * Show help menu
 */
export function showHelpMenu(ctx: any) {
    const helpMessage = `
📋 **Справка по командам Max efficiency**

**Основные команды:**
• \`/start\` - Главное меню
• \`/help\` - Эта справка
• \`/task\` - Создать новую задачу
• \`/tasks\` - Просмотр задач
• \`/stats\` - Статистика выполнения
• \`/focus\` - Запустить таймер фокуса (25 минут)
• \`/ai\` - AI помощник

**🎤 Голосовые сообщения:**
• Отправьте голосовое сообщение для создания задачи
• AI автоматически распознает речь и извлечет:
  - Название задачи
  - Описание
  - Приоритет (высокий/средний/низкий)
  - Дедлайн (сегодня/завтра/через N дней)
• **Примеры:**
  - _"Купить молоко"_
  - _"Позвонить клиенту завтра"_
  - _"Срочно: подготовить отчет через 3 дня"_

**AI Помощник:**
• Создавайте задачи естественным языком (текстом)
• Задавайте вопросы о продуктивности
• Получайте советы по управлению временем
• Просто напишите боту, что вам нужно!

**Управление задачами:**
• В разделе "Задачи" вы можете просматривать, выполнять и удалять свои задачи
• Задачи сортируются по приоритету (высокий, средний, низкий)
• Доступна статистика по выполнению задач

**Нужна помощь?**
Если у вас возникли проблемы, проверьте, что вы используете актуальные команды из этого списка.
    `.trim();

    const keyboard = Keyboard.inlineKeyboard([
        [Keyboard.button.callback('⬅️ Главное меню', 'menu:main')]
    ]);

    if (ctx.answerOnCallback) {
        return ctx.answerOnCallback({
            message: {
                text: helpMessage,
                attachments: [keyboard],
                format: 'markdown'
            }
        });
    } else {
        return ctx.reply(helpMessage, {
            format: 'markdown',
            attachments: [keyboard]
        });
    }
}