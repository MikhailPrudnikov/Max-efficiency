import crypto from 'crypto';
import { MaxUser } from '../types/index.js';
import { env } from '../config/env.js';

/**
 * MAX WebApp initData validation utility
 * Implements the exact algorithm from MAX documentation
 */

/**
 * Validates MAX initData according to official documentation
 * 
 * Algorithm:
 * 1. URL-decode the initData string
 * 2. Split into key=value pairs
 * 3. Remove the 'hash' pair
 * 4. Sort remaining pairs alphabetically by key
 * 5. Join with '\n' to create data_check_string
 * 6. Create secret_key = HMAC_SHA256("WebAppData" + BOT_TOKEN)
 * 7. Compute hash = HMAC_SHA256(secret_key, data_check_string)
 * 8. Compare computed hash with original hash
 * 
 * @param initData - The initData string from window.WebApp.initData
 * @returns Object with validation result and parsed user data
 */
export function validateInitData(initData: string): {
    valid: boolean;
    user: MaxUser | null;
    error?: string;
} {
    try {
        // Check if initData is provided
        if (!initData || initData.trim() === '') {
            return {
                valid: false,
                user: null,
                error: 'initData is empty',
            };
        }

        // Check if BOT_TOKEN is configured
        if (!env.MAX_BOT_TOKEN) {
            console.error('MAX_BOT_TOKEN is not configured');
            return {
                valid: false,
                user: null,
                error: 'Server configuration error',
            };
        }

        // Step 1: URL-decode the initData
        const decodedData = decodeURIComponent(initData);

        // Step 2: Split into key=value pairs
        const params = new URLSearchParams(decodedData);
        const pairs: Record<string, string> = {};
        let originalHash = '';

        params.forEach((value, key) => {
            if (key === 'hash') {
                originalHash = value;
            } else {
                pairs[key] = value;
            }
        });

        // Check if hash exists
        if (!originalHash) {
            return {
                valid: false,
                user: null,
                error: 'Hash not found in initData',
            };
        }

        // Step 3 & 4: Sort pairs alphabetically by key
        const sortedKeys = Object.keys(pairs).sort();

        // Step 5: Create data_check_string with '\n' separator
        const dataCheckString = sortedKeys
            .map((key) => `${key}=${pairs[key]}`)
            .join('\n');

        // Step 6: Create secret_key
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(env.MAX_BOT_TOKEN)
            .digest();

        // Step 7: Compute hash
        const computedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        // Step 8: Compare hashes
        const isValid = computedHash === originalHash;

        if (!isValid) {
            return {
                valid: false,
                user: null,
                error: 'Invalid hash - data may be tampered',
            };
        }

        // Parse user data if validation successful
        const userParam = pairs['user'];
        if (!userParam) {
            return {
                valid: false,
                user: null,
                error: 'User data not found in initData',
            };
        }

        const user = parseUserData(userParam);
        if (!user) {
            return {
                valid: false,
                user: null,
                error: 'Failed to parse user data',
            };
        }

        return {
            valid: true,
            user,
        };
    } catch (error) {
        console.error('Error validating initData:', error);
        return {
            valid: false,
            user: null,
            error: 'Validation error occurred',
        };
    }
}

/**
 * Parses user data from the user parameter
 * Provides safe defaults for all fields
 * 
 * @param userJson - JSON string containing user data
 * @returns Parsed MaxUser object or null if parsing fails
 */
function parseUserData(userJson: string): MaxUser | null {
    try {
        const parsed = JSON.parse(userJson);

        // Validate that id exists and is a number
        if (typeof parsed.id !== 'number' || parsed.id === 0) {
            console.error('Invalid user id:', parsed.id);
            return null;
        }

        // Return user with safe defaults for all fields
        return {
            id: parsed.id,
            first_name: parsed.first_name || '',
            last_name: parsed.last_name || '',
            username: parsed.username || null,
            language_code: parsed.language_code || '',
            photo_url: parsed.photo_url || null,
        };
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

/**
 * Normalizes user data for database storage
 * Converts null values to empty strings as per database schema
 * 
 * @param user - MaxUser object from validation
 * @returns Normalized user data ready for database insertion
 */
export function normalizeUserForDb(user: MaxUser): {
    max_user_id: number;
    first_name: string;
    last_name: string;
    username: string;
    language_code: string;
    photo_url: string;
} {
    return {
        max_user_id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        language_code: user.language_code || '',
        photo_url: user.photo_url || '',
    };
}