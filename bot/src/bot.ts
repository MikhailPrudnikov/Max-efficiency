import { Bot } from '@maxhub/max-bot-api';
import { env, validateEnv } from './config/env.js';
import { testConnection, closePool } from './config/database.js';
import { createFreshUpdateMiddleware } from './utils.js';
import { handleStartCommand, handleFocusCommand, handleUnknownCommand, showHelpMenu } from './handlers/basicHandlers.js';
import {
    handleTaskCommand,
    handleTaskCreate,
    handleTaskInput,
    handleDeadlineSelection,
    handlePrioritySelection,
    handleTaskCancel,
    handleTasksCommand,
    handleTasksList,
    handleTaskView,
    handleTaskComplete,
    handleTaskDelete,
    handleStatsCommand,
    handleStatsShow,
    handleStatsClear
} from './handlers/taskHandlers.js';
import {
    handleAiCommand,
    handleAiCreateTask,
    handleAiAsk,
    handleAiMessage
} from './handlers/aiHandlers.js';
import { handleVoiceMessage } from './handlers/voiceHandlers.js';
import { initGigaChat } from './services/gigachat.js';
import { initSberSpeech } from './services/sberSpeech.js';
import { stateManager } from './stateManager.js';

// Validate environment variables
validateEnv();

// Initialize database
try {
    console.log('🔄 Attempting to initialize database...');
    console.log(`📊 Using database: ${env.DATABASE_URL ? 'DATABASE_URL' : `${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`}`);
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Failed to connect to database');
        process.exit(1);
    }
    console.log('✅ Database successfully initialized');
} catch (err) {
    console.error('❌ Critical database initialization error:', err);
    process.exit(1);
}

// Initialize GigaChat
try {
    if (env.GIGACHAT_AUTH_TOKEN) {
        initGigaChat(env.GIGACHAT_AUTH_TOKEN);
        console.log('✅ GigaChat AI service initialized');
    } else {
        console.warn('⚠️ GIGACHAT_AUTH_TOKEN not found. AI features will be disabled.');
    }
} catch (err) {
    console.error('❌ Failed to initialize GigaChat:', err);
    console.warn('⚠️ AI features will be disabled.');
}

// Initialize Sber SmartSpeech
try {
    if (env.SBER_SPEECH_AUTH_TOKEN) {
        initSberSpeech(env.SBER_SPEECH_AUTH_TOKEN);
        console.log('✅ Sber SmartSpeech service initialized');
    } else {
        console.warn('⚠️ SBER_SPEECH_AUTH_TOKEN not found. Voice message features will be disabled.');
    }
} catch (err) {
    console.error('❌ Failed to initialize Sber SmartSpeech:', err);
    console.warn('⚠️ Voice message features will be disabled.');
}

const botToken = env.BOT_TOKEN;
if (!botToken) {
    console.error('❌ Error: BOT_TOKEN not found. Check .env file.');
    process.exit(1);
}

let currentBotInstance: Bot | null = null;
let botStartTime: number = Date.now();

export function createAndConfigureBot(): Bot {
    console.log('🤖 Creating new bot instance...');
    const bot = new Bot(botToken!);

    // Middleware to filter old messages
    bot.use(createFreshUpdateMiddleware(() => botStartTime));

    // Basic commands
    bot.command('start', handleStartCommand);
    bot.command('focus', (ctx) => handleFocusCommand(ctx, bot));
    bot.command('help', showHelpMenu);

    // Task commands
    bot.command('task', handleTaskCommand);
    bot.command('tasks', handleTasksCommand);
    bot.command('stats', handleStatsCommand);

    // AI commands
    bot.command('ai', handleAiCommand);

    // Callback handlers for help and menu
    bot.action('help:show', (ctx) => showHelpMenu(ctx));
    bot.action('menu:main', handleStartCommand);

    // Callback handlers for tasks
    bot.action('task:create', handleTaskCreate);
    bot.action('task:cancel', handleTaskCancel);
    bot.action('focus:start', (ctx) => handleFocusCommand(ctx, bot));
    bot.action(/deadline:(.+)/, handleDeadlineSelection);
    bot.action(/priority:(.+)/, handlePrioritySelection);
    bot.action('tasks:list', handleTasksList);
    bot.action(/task:view:([a-f0-9-]+)/, handleTaskView);
    bot.action(/task:complete:([a-f0-9-]+)/, handleTaskComplete);
    bot.action(/task:delete:([a-f0-9-]+)/, handleTaskDelete);

    // Callback handlers for stats
    bot.action('stats:show', handleStatsShow);
    bot.action('stats:clear', handleStatsClear);

    // Callback handlers for AI
    bot.action('ai:create_task', handleAiCreateTask);
    bot.action('ai:ask', handleAiAsk);

    // Handle text messages for task input and AI
    bot.on('message_created', async (ctx, next) => {
        const userId = (ctx as any).user?.user_id;
        const messageText = ctx.message?.body?.text;

        // Check for voice/audio message (Max Bot API uses 'audio' type for voice messages)
        const message = ctx.message as any;
        const hasAudio = message?.body?.attachments?.some((att: any) => att.type === 'audio');

        if (hasAudio && env.SBER_SPEECH_AUTH_TOKEN) {
            console.log('🎤 Processing voice/audio message...');
            await handleVoiceMessage(ctx);
            return next();
        }

        // If user is in input process - handle with special handlers
        if (userId && stateManager.hasUserState(userId)) {
            await handleTaskInput(ctx);
        } else if (messageText && !messageText.startsWith('/')) {
            // Try to handle as AI message if GigaChat is available
            if (env.GIGACHAT_AUTH_TOKEN) {
                await handleAiMessage(ctx);
            } else {
                // Try to handle as task input anyway
                await handleTaskInput(ctx);

                // Show help for unknown messages
                if (userId && !stateManager.hasUserState(userId)) {
                    await handleUnknownCommand(ctx);
                }
            }
        }

        return next();
    });

    return bot;
}

// Async function to run bot with automatic restart on errors
export async function runBotWithRetry() {
    try {
        // Clear user states on startup
        stateManager.clear();

        // Update bot start time
        botStartTime = Date.now();
        console.log(`⏰ Bot start time set: ${new Date(botStartTime).toISOString()}`);

        currentBotInstance = createAndConfigureBot();

        console.log('🚀 Attempting to start bot (bot.start())...');
        await currentBotInstance.start();
        console.log('✅ Bot stopped normally. Restart loop will not be activated.');

    } catch (err: any) {
        console.error(`❌ Critical bot.start() error: ${err.message}`);

        currentBotInstance = null;
        stateManager.clear();

        if (err.message.includes('fetch failed') || err.code === 'ECONNRESET') {
            console.error('🔥 Network or TLS failure detected. Attempting restart in 10 seconds...');
        } else {
            console.error('🔥 Unknown error. Attempting restart in 10 seconds...');
        }

        setTimeout(runBotWithRetry, 10000);
    }
}

// Handle bot shutdown
const handleShutdown = async (signal: string) => {
    console.log(`🛑 Received ${signal} signal, stopping bot...`);

    if (currentBotInstance) {
        console.log('...sending bot.stop() command...');
        currentBotInstance.stop();
        currentBotInstance = null;
        console.log('✅ Bot stopped');
    } else {
        console.log('...bot was already stopped or in restart process.');
    }

    stateManager.clear();

    // Close database connections
    await closePool();

    process.exit(0);
};

process.once('SIGINT', () => handleShutdown('SIGINT'));
process.once('SIGTERM', () => handleShutdown('SIGTERM'));

// Start main loop
runBotWithRetry();