import { getSberSpeech } from '../services/sberSpeech.js';
import { getGigaChat } from '../services/gigachat.js';
import { addTask } from '../db.js';
import { isFreshMessage, getPriorityEmoji, getPriorityText } from '../utils.js';
import { Keyboard } from '@maxhub/max-bot-api';
import axios from 'axios';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import { exec } from 'child_process';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const execPromise = promisify(exec);

/**
 * Handle voice message - download, convert, recognize, and process
 */
export async function handleVoiceMessage(ctx: any) {
    if (!isFreshMessage(ctx, Date.now())) return;

    const userId = ctx.user?.user_id;
    if (!userId) {
        return ctx.reply('Ошибка: не удалось определить пользователя.');
    }

    // Check if audio message exists (Max Bot API uses 'audio' type for voice messages)
    const message = ctx.message as any;
    const audio = message?.body?.attachments?.find((att: any) => att.type === 'audio');
    if (!audio) {
        return;
    }

    // Show processing indicator
    await ctx.reply('🎤 Обрабатываю голосовое сообщение...');

    let tempOggPath: string | null = null;
    let tempWavPath: string | null = null;

    try {
        // Download audio message
        const fileUrl = audio.payload?.url;
        if (!fileUrl) {
            throw new Error('Audio message URL not found');
        }

        console.log('📥 Downloading voice message from:', fileUrl);

        // Create temp directory if it doesn't exist
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Download OGG file
        tempOggPath = path.join(tempDir, `voice_${userId}_${Date.now()}.ogg`);
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        await writeFile(tempOggPath, response.data);

        console.log('✅ Voice message downloaded:', tempOggPath);

        // Convert OGG to WAV (16kHz, 16-bit PCM mono)
        tempWavPath = tempOggPath.replace('.ogg', '.wav');

        // Check if ffmpeg is available
        try {
            await execPromise('ffmpeg -version');
        } catch (error) {
            throw new Error('FFmpeg not installed. Please install ffmpeg to process voice messages.');
        }

        const ffmpegCommand = `ffmpeg -i "${tempOggPath}" -ar 16000 -ac 1 -sample_fmt s16 "${tempWavPath}" -y`;
        console.log('🔄 Converting audio:', ffmpegCommand);

        await execPromise(ffmpegCommand);
        console.log('✅ Audio converted to WAV');

        // Recognize speech
        const sberSpeech = getSberSpeech();
        const recognizedText = await sberSpeech.recognizeSpeechFromFile(tempWavPath);

        if (!recognizedText || recognizedText.trim().length === 0) {
            return ctx.reply(
                '❌ **Не удалось распознать речь**\n\n' +
                'Попробуйте:\n' +
                '• Говорить четче и громче\n' +
                '• Записать сообщение в тихом месте\n' +
                '• Использовать текстовые команды',
                { format: 'markdown' }
            );
        }

        console.log('✅ Speech recognized:', recognizedText);

        // Show recognized text
        await ctx.reply(
            `🎤 **Распознанный текст:**\n\n"${recognizedText}"\n\n🤖 Обрабатываю запрос...`,
            { format: 'markdown' }
        );

        // Process with AI to create task
        await processVoiceTaskCreation(ctx, userId, recognizedText);

    } catch (error: any) {
        console.error('❌ Error processing voice message:', error);

        let errorMessage = '❌ **Ошибка при обработке голосового сообщения**\n\n';

        if (error.message.includes('FFmpeg')) {
            errorMessage += 'FFmpeg не установлен. Обратитесь к администратору.\n\n';
        } else if (error.message.includes('authenticate')) {
            errorMessage += 'Ошибка аутентификации в Sber SmartSpeech.\n\n';
        } else if (error.message.includes('recognize')) {
            errorMessage += 'Не удалось распознать речь. Попробуйте записать сообщение заново.\n\n';
        } else {
            errorMessage += `${error.message}\n\n`;
        }

        errorMessage += 'Вы можете использовать текстовые команды для создания задач.';

        return ctx.reply(errorMessage, { format: 'markdown' });
    } finally {
        // Clean up temp files
        if (tempOggPath && fs.existsSync(tempOggPath)) {
            try {
                await unlink(tempOggPath);
                console.log('🗑️ Cleaned up temp OGG file');
            } catch (err) {
                console.error('Error deleting temp OGG file:', err);
            }
        }
        if (tempWavPath && fs.existsSync(tempWavPath)) {
            try {
                await unlink(tempWavPath);
                console.log('🗑️ Cleaned up temp WAV file');
            } catch (err) {
                console.error('Error deleting temp WAV file:', err);
            }
        }
    }
}

/**
 * Process recognized text and create task using AI
 */
async function processVoiceTaskCreation(ctx: any, userId: number, recognizedText: string) {
    try {
        const gigaChat = getGigaChat();

        // Parse task intent from recognized text
        const taskIntent = await gigaChat.parseTaskIntent(recognizedText);

        if (taskIntent.isTaskCreation && taskIntent.title) {
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

            let message = '✅ **Задача создана из голосового сообщения!**\n\n';
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
                [Keyboard.button.callback('➕ Создать еще', 'task:create')],
                [Keyboard.button.callback('⬅️ Главное меню', 'menu:main')]
            ]);

            return ctx.reply(message, {
                format: 'markdown',
                attachments: [keyboard]
            });
        } else {
            // Not a task creation - provide helpful response
            const answer = await gigaChat.answerQuestion(recognizedText);

            const keyboard = Keyboard.inlineKeyboard([
                [Keyboard.button.callback('📝 Создать задачу', 'task:create')],
                [Keyboard.button.callback('⬅️ Главное меню', 'menu:main')]
            ]);

            return ctx.reply(
                `🤖 **Ответ:**\n\n${answer}\n\n_Если вы хотели создать задачу, попробуйте сформулировать запрос более явно, например: "Создай задачу: позвонить клиенту завтра"_`,
                {
                    format: 'markdown',
                    attachments: [keyboard]
                }
            );
        }
    } catch (error) {
        console.error('Error processing voice task creation:', error);
        return ctx.reply(
            '❌ **Ошибка при создании задачи**\n\n' +
            'Не удалось обработать запрос. Попробуйте использовать команду /task для ручного создания.',
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