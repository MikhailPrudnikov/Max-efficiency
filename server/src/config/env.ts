import dotenv from 'dotenv';
import { EnvConfig } from '../types/index.js';

// Load environment variables
dotenv.config();

/**
 * Validates and exports environment configuration
 * Provides safe defaults where appropriate
 */
export const env: EnvConfig = {
    PORT: parseInt(process.env.PORT || '3001', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Database configuration
    DATABASE_URL: process.env.DATABASE_URL,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_NAME: process.env.DB_NAME || 'maxflow_zen',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || '',

    // MAX Bot configuration
    MAX_BOT_TOKEN: process.env.MAX_BOT_TOKEN || '',

    // JWT configuration
    JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

    // CORS configuration
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

/**
 * Validates required environment variables
 * Logs warnings for missing critical configuration
 */
export function validateEnv(): void {
    const warnings: string[] = [];

    if (!env.MAX_BOT_TOKEN) {
        warnings.push('MAX_BOT_TOKEN is not set - MAX authentication will fail');
    }

    if (env.JWT_SECRET === 'default-secret-change-in-production' && env.NODE_ENV === 'production') {
        warnings.push('JWT_SECRET is using default value in production - this is insecure!');
    }

    if (!env.DATABASE_URL && !env.DB_PASSWORD) {
        warnings.push('Database password is not set - connection may fail');
    }

    if (warnings.length > 0) {
        console.warn('⚠️  Environment Configuration Warnings:');
        warnings.forEach(warning => console.warn(`   - ${warning}`));
    }
}