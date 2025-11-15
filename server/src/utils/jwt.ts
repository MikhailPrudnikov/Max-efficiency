import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index.js';
import { env } from '../config/env.js';

/**
 * JWT utility functions for token generation and verification
 */

/**
 * Generates a JWT token for authenticated user
 * 
 * @param userId - Internal database user ID
 * @param maxUserId - MAX user ID
 * @returns JWT token string
 */
export function generateToken(userId: number, maxUserId: number): string {
    const payload: JwtPayload = {
        userId,
        maxUserId,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
}

/**
 * Verifies and decodes a JWT token
 * 
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        return decoded;
    } catch (error) {
        console.error('JWT verification failed:', error);
        return null;
    }
}

/**
 * Extracts token from Authorization header
 * 
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}