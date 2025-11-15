import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const requestId = Date.now().toString(36);
    console.log(`\n🔒 [${requestId}] Auth middleware: ${req.method} ${req.path}`);

    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (!token) {
            console.warn(`❌ [${requestId}] Auth failed: No token provided`);
            console.log(`   - Authorization header: ${authHeader ? 'present but invalid format' : 'missing'}`);
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        console.log(`🔑 [${requestId}] Token found, verifying...`);
        const payload = verifyToken(token);

        if (!payload) {
            console.warn(`❌ [${requestId}] Auth failed: Invalid or expired token`);
            res.status(401).json({ error: 'Invalid token' });
            return;
        }

        console.log(`✅ [${requestId}] Token verified successfully`);
        console.log(`   - User ID: ${payload.userId}`);
        console.log(`   - MAX User ID: ${payload.maxUserId}`);

        // Attach user info to request
        (req as any).userId = payload.userId;
        (req as any).maxUserId = payload.maxUserId;

        next();
    } catch (error) {
        console.error(`❌ [${requestId}] Auth middleware error:`, error);
        console.error(`   - Error type: ${error instanceof Error ? error.name : typeof error}`);
        console.error(`   - Error message: ${error instanceof Error ? error.message : String(error)}`);
        res.status(401).json({ error: 'Authentication failed' });
    }
}