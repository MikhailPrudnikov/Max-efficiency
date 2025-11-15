import axios from 'axios';
import https from 'https';

/**
 * GigaChat API Service
 * Handles authentication and chat completions with GigaChat LLM
 */

interface GigaChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface GigaChatResponse {
    choices: Array<{
        message: {
            content: string;
            role: string;
        };
        index: number;
        finish_reason: string;
    }>;
    created: number;
    model: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

class GigaChatService {
    private tokenUrl = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
    private chatUrl = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
    private authToken: string;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    // Create axios instance that ignores SSL verification
    private axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    constructor(authToken: string) {
        this.authToken = authToken;
    }

    /**
     * Get or refresh access token
     */
    private async getAccessToken(): Promise<string> {
        // Check if token is still valid (with 5 minute buffer)
        if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
            return this.accessToken;
        }

        try {
            const response = await this.axiosInstance.post(
                this.tokenUrl,
                'scope=GIGACHAT_API_PERS',
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                        'RqUID': this.generateRqUID(),
                        'Authorization': `Basic ${this.authToken}`
                    }
                }
            );

            const token = response.data.access_token;
            if (!token) {
                throw new Error('No access token in response');
            }

            this.accessToken = token;
            // Tokens typically expire in 30 minutes
            this.tokenExpiry = Date.now() + 1800000;

            console.log('✅ GigaChat access token obtained');
            return token;
        } catch (error: any) {
            console.error('❌ Error getting GigaChat token:', error.message);
            throw new Error('Failed to authenticate with GigaChat');
        }
    }

    /**
     * Generate unique request ID
     */
    private generateRqUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Send chat completion request
     */
    async chat(
        messages: GigaChatMessage[],
        options: {
            temperature?: number;
            maxTokens?: number;
            model?: string;
        } = {}
    ): Promise<string> {
        const token = await this.getAccessToken();

        const payload = {
            model: options.model || 'GigaChat',
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1024,
            n: 1
        };

        try {
            const response = await this.axiosInstance.post<GigaChatResponse>(
                this.chatUrl,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error: any) {
            console.error('❌ Error calling GigaChat API:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
            throw new Error('Failed to get response from GigaChat');
        }
    }

    /**
     * Simple chat with single user message
     */
    async simpleChat(userMessage: string, systemPrompt?: string): Promise<string> {
        const messages: GigaChatMessage[] = [];

        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        }

        messages.push({
            role: 'user',
            content: userMessage
        });

        return this.chat(messages);
    }

    /**
     * Parse task creation intent from user message
     */
    async parseTaskIntent(userMessage: string): Promise<{
        isTaskCreation: boolean;
        title?: string;
        description?: string;
        priority?: 'high' | 'medium' | 'low';
        deadline?: string;
    }> {
        const systemPrompt = `Ты - помощник по анализу намерений пользователя в системе управления задачами.
Твоя задача - определить, хочет ли пользователь создать задачу, и извлечь из его сообщения:
- Название задачи (title)
- Описание задачи (description)
- Приоритет (priority): high, medium или low
- Дедлайн (deadline) в формате "сегодня", "завтра", "через N дней/часов" или конкретную дату

Отвечай ТОЛЬКО в формате JSON без дополнительного текста:
{
  "isTaskCreation": true/false,
  "title": "название задачи",
  "description": "описание",
  "priority": "high/medium/low",
  "deadline": "сегодня/завтра/через 3 дня/2024-12-31"
}

Если пользователь НЕ хочет создать задачу, верни: {"isTaskCreation": false}`;

        try {
            const response = await this.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ], { temperature: 0.3 });

            // Try to parse JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return { isTaskCreation: false };
        } catch (error) {
            console.error('Error parsing task intent:', error);
            return { isTaskCreation: false };
        }
    }

    /**
     * Answer general questions about tasks and productivity
     */
    async answerQuestion(question: string, context?: string): Promise<string> {
        const systemPrompt = `Ты - AI-помощник в системе управления задачами MaxFlow Zen.
Твоя задача - помогать пользователям с вопросами о продуктивности, управлении задачами и использовании системы.

Отвечай кратко, по делу и дружелюбно. Используй эмодзи для наглядности.
${context ? `\n\nКонтекст пользователя:\n${context}` : ''}`;

        return this.simpleChat(question, systemPrompt);
    }
}

// Singleton instance
let gigaChatInstance: GigaChatService | null = null;

export function initGigaChat(authToken: string): GigaChatService {
    if (!gigaChatInstance) {
        gigaChatInstance = new GigaChatService(authToken);
    }
    return gigaChatInstance;
}

export function getGigaChat(): GigaChatService {
    if (!gigaChatInstance) {
        throw new Error('GigaChat service not initialized. Call initGigaChat first.');
    }
    return gigaChatInstance;
}

export { GigaChatService };