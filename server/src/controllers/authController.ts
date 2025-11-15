import { Request, Response } from 'express';
import { query } from '../config/database.js';
import { validateInitData, normalizeUserForDb } from '../utils/maxAuth.js';
import { generateToken } from '../utils/jwt.js';
import { AuthRequest, AuthResponse, DbUser } from '../types/index.js';

/**
 * Auth controller for MAX mini-application
 * Handles user authentication via MAX initData validation
 */

/**
 * POST /api/auth/max
 * Authenticates user via MAX initData
 * Creates or updates user in database
 * Returns JWT token and user data
 */
export async function authenticateMax(
    req: Request<{}, {}, AuthRequest>,
    res: Response<AuthResponse>
): Promise<void> {
    const requestId = Date.now().toString(36);
    console.log(`\n🔐 [${requestId}] Authentication request received`);

    try {
        const { initData } = req.body;

        // Validate initData is provided
        if (!initData || typeof initData !== 'string') {
            console.warn(`❌ [${requestId}] GUEST MODE REASON: No initData provided or invalid type`);
            console.log(`   - initData present: ${!!initData}`);
            console.log(`   - initData type: ${typeof initData}`);
            res.status(400).json({
                authenticated: false,
            });
            return;
        }

        console.log(`📝 [${requestId}] initData received (length: ${initData.length})`);

        // Validate initData using MAX algorithm
        const validation = validateInitData(initData);

        if (!validation.valid || !validation.user) {
            console.warn(`❌ [${requestId}] GUEST MODE REASON: MAX validation failed`);
            console.log(`   - Validation error: ${validation.error}`);
            console.log(`   - User data present: ${!!validation.user}`);
            res.status(200).json({
                authenticated: false,
            });
            return;
        }

        console.log(`✅ [${requestId}] MAX validation successful`);
        console.log(`   - User ID: ${validation.user.id}`);
        console.log(`   - Username: ${validation.user.username || 'not set'}`);
        console.log(`   - Name: ${validation.user.first_name} ${validation.user.last_name}`);

        const maxUser = validation.user;
        const normalizedUser = normalizeUserForDb(maxUser);

        console.log(`🔍 [${requestId}] Checking database for user ${normalizedUser.max_user_id}`);

        // Try to find existing user by max_user_id
        const findUserResult = await query<DbUser>(
            'SELECT * FROM users WHERE max_user_id = $1',
            [normalizedUser.max_user_id]
        );

        // Handle database error gracefully
        if (findUserResult === null) {
            console.error(`❌ [${requestId}] GUEST MODE REASON: Database query failed`);
            console.log(`   - Could not query users table`);
            res.status(200).json({
                authenticated: false,
            });
            return;
        }

        let user: DbUser;

        if (findUserResult.rows.length > 0) {
            console.log(`👤 [${requestId}] Existing user found, updating data`);

            // User exists - update their data
            const updateResult = await query<DbUser>(
                `UPDATE users
         SET first_name = $1,
             last_name = $2,
             username = $3,
             language_code = $4,
             photo_url = $5,
             last_login_at = NOW()
         WHERE max_user_id = $6
         RETURNING *`,
                [
                    normalizedUser.first_name,
                    normalizedUser.last_name,
                    normalizedUser.username,
                    normalizedUser.language_code,
                    normalizedUser.photo_url,
                    normalizedUser.max_user_id,
                ]
            );

            if (updateResult === null || updateResult.rows.length === 0) {
                console.error(`❌ [${requestId}] GUEST MODE REASON: Failed to update user in database`);
                res.status(200).json({
                    authenticated: false,
                });
                return;
            }

            user = updateResult.rows[0];
            console.log(`✅ [${requestId}] User updated successfully: ${user.max_user_id}`);
        } else {
            console.log(`👤 [${requestId}] New user, creating in database`);

            // User doesn't exist - create new user
            const insertResult = await query<DbUser>(
                `INSERT INTO users (
          max_user_id,
          first_name,
          last_name,
          username,
          language_code,
          photo_url,
          phone,
          last_login_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *`,
                [
                    normalizedUser.max_user_id,
                    normalizedUser.first_name,
                    normalizedUser.last_name,
                    normalizedUser.username,
                    normalizedUser.language_code,
                    normalizedUser.photo_url,
                    '', // phone defaults to empty string
                ]
            );

            if (insertResult === null || insertResult.rows.length === 0) {
                console.error(`❌ [${requestId}] GUEST MODE REASON: Failed to create user in database`);
                res.status(200).json({
                    authenticated: false,
                });
                return;
            }

            user = insertResult.rows[0];
            console.log(`✅ [${requestId}] New user created successfully: ${user.max_user_id}`);
        }

        // Generate JWT token
        console.log(`🔑 [${requestId}] Generating JWT token`);
        const token = generateToken(user.id, user.max_user_id);

        console.log(`✅ [${requestId}] Authentication successful!`);
        console.log(`   - User: ${user.first_name} ${user.last_name} (@${user.username || 'no username'})`);
        console.log(`   - Token generated: ${token.substring(0, 20)}...`);

        // Return success response with user data and token
        res.status(200).json({
            authenticated: true,
            user: {
                id: user.id,
                max_user_id: user.max_user_id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                language_code: user.language_code,
                photo_url: user.photo_url,
                phone: user.phone,
            },
            token,
        });
    } catch (error) {
        console.error(`❌ [${requestId}] GUEST MODE REASON: Unexpected error in authenticateMax`);
        console.error(`   - Error type: ${error instanceof Error ? error.name : typeof error}`);
        console.error(`   - Error message: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`   - Stack trace:`, error);

        // Return unauthenticated instead of 500 to allow guest mode
        res.status(200).json({
            authenticated: false,
        });
    }
}

/**
 * POST /api/user/phone
 * Updates user's phone number
 * Requires authentication
 */
export async function updatePhone(
    req: Request<{}, {}, { phone: string }>,
    res: Response
): Promise<void> {
    try {
        // Extract user from request (set by auth middleware)
        const userId = (req as any).userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { phone } = req.body;

        if (!phone || typeof phone !== 'string') {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }

        // Update phone in database
        const result = await query<DbUser>(
            'UPDATE users SET phone = $1 WHERE id = $2 RETURNING *',
            [phone, userId]
        );

        if (result === null || result.rows.length === 0) {
            res.status(500).json({ error: 'Failed to update phone' });
            return;
        }

        res.status(200).json({
            success: true,
            phone: result.rows[0].phone,
        });
    } catch (error) {
        console.error('Error updating phone:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}