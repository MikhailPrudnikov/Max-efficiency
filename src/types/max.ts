/**
 * Type definitions for MAX WebApp integration
 */

// MAX WebApp global object
declare global {
    interface Window {
        WebApp?: {
            initData: string;
            initDataUnsafe: WebAppInitData;
            version: string;
            platform: 'ios' | 'android' | 'desktop' | 'web';
            ready: () => void;
            close: () => void;
            requestContact: () => void;
            openLink: (url: string) => void;
            openMaxLink: (url: string) => void;
            shareContent: (content: string) => void;
            shareMaxContent: (content: string) => void;
            downloadFile: (url: string, filename: string) => void;
            openCodeReader: () => void;
            enableClosingConfirmation: () => void;
            disableClosingConfirmation: () => void;
        };
    }
}

// WebApp Init Data structure (from initDataUnsafe)
export interface WebAppInitData {
    query_id?: string;
    user?: WebAppUser;
    auth_date?: number;
    hash?: string;
}

// User data from MAX
export interface WebAppUser {
    id: number;
    first_name: string;
    last_name: string;
    username: string | null;
    language_code: string;
    photo_url: string | null;
}

// User data from backend (after authentication)
export interface User {
    id: number;
    max_user_id: number;
    first_name: string;
    last_name: string;
    username: string;
    language_code: string;
    photo_url: string;
    phone: string;
}

// Auth response from backend
export interface AuthResponse {
    authenticated: boolean;
    user?: User;
    token?: string;
}

// Auth request to backend
export interface AuthRequest {
    initData: string;
}