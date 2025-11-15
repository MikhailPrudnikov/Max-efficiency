import { Request, Response } from 'express';
import { query } from '../config/database.js';

export const getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ getSettings: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const result = await query(
            'SELECT * FROM user_settings WHERE user_id = $1',
            [userId]
        );

        if (!result || result.rows.length === 0) {
            // Return default settings
            res.json({
                settings: {
                    integrations: {},
                    focus_mode: {},
                    calendar_settings: {},
                    theme: 'system'
                }
            });
            return;
        }

        res.json({ settings: result.rows[0] });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            error: 'Failed to fetch settings',
            settings: {
                integrations: {},
                focus_mode: {},
                calendar_settings: {},
                theme: 'system'
            }
        });
    }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ updateSettings: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { integrations, focus_mode, calendar_settings, theme } = req.body;

        const result = await query(
            `INSERT INTO user_settings (user_id, integrations, focus_mode, calendar_settings, theme)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id)
             DO UPDATE SET
                 integrations = COALESCE($2, user_settings.integrations),
                 focus_mode = COALESCE($3, user_settings.focus_mode),
                 calendar_settings = COALESCE($4, user_settings.calendar_settings),
                 theme = COALESCE($5, user_settings.theme)
             RETURNING *`,
            [
                userId,
                integrations ? JSON.stringify(integrations) : null,
                focus_mode ? JSON.stringify(focus_mode) : null,
                calendar_settings ? JSON.stringify(calendar_settings) : null,
                theme
            ]
        );

        res.json({ settings: result?.rows[0] || null });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
