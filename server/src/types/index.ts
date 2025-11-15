/**
 * Type definitions for MAX mini-application backend
 */

// MAX WebApp User data structure
export interface MaxUser {
    id: number;
    first_name: string;
    last_name: string;
    username: string | null;
    language_code: string;
    photo_url: string | null;
}

// Database User model
export interface DbUser {
    id: number;
    max_user_id: number;
    first_name: string;
    last_name: string;
    username: string;
    language_code: string;
    photo_url: string;
    phone: string;
    created_at: Date;
    updated_at: Date;
    last_login_at: Date | null;
}

// Auth request/response types
export interface AuthRequest {
    initData: string;
}

export interface AuthResponse {
    authenticated: boolean;
    user?: {
        id: number;
        max_user_id: number;
        first_name: string;
        last_name: string;
        username: string;
        language_code: string;
        photo_url: string;
        phone: string;
    };
    token?: string;
}

// JWT Payload
export interface JwtPayload {
    userId: number;
    maxUserId: number;
    iat?: number;
    exp?: number;
}

// Environment variables
export interface EnvConfig {
    PORT: number;
    NODE_ENV: string;
    DATABASE_URL?: string;
    DB_HOST?: string;
    DB_PORT?: number;
    DB_NAME?: string;
    DB_USER?: string;
    DB_PASSWORD?: string;
    MAX_BOT_TOKEN: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    CORS_ORIGIN: string;
}