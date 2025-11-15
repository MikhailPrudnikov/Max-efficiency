import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment configuration for bot
 * Matches server configuration structure
 */
export interface BotEnvConfig {
    NODE_ENV: string;
    BOT_TOKEN: string;
    DATABASE_URL?: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    GIGACHAT_AUTH_TOKEN?: string;
    SBER_SPEECH_AUTH_TOKEN?: string;
}

/**
 * Validates and exports environment configuration
 * Provides safe defaults where appropriate
 */
export const env: BotEnvConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    BOT_TOKEN: process.env.BOT_TOKEN || '',

    // Database configuration
    DATABASE_URL: process.env.DATABASE_URL,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_NAME: process.env.DB_NAME || 'maxflow_zen',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || '',

    // GigaChat AI configuration
    GIGACHAT_AUTH_TOKEN: process.env.GIGACHAT_AUTH_TOKEN,

    // Sber SmartSpeech configuration
    SBER_SPEECH_AUTH_TOKEN: process.env.SBER_SPEECH_AUTH_TOKEN,
};

/**
 * Validates required environment variables
 * Logs warnings for missing critical configuration
 */
export function validateEnv(): void {
    const warnings: string[] = [];

    if (!env.BOT_TOKEN) {
        warnings.push('BOT_TOKEN is not set - bot will not start');
    }

    if (!env.DATABASE_URL && !env.DB_PASSWORD) {
        warnings.push('Database password is not set - connection may fail');
    }

    if (warnings.length > 0) {
        console.warn('⚠️  Bot Environment Configuration Warnings:');
        warnings.forEach(warning => console.warn(`   - ${warning}`));
    }
}