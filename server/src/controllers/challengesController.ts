import { Request, Response } from 'express';
import { query } from '../config/database.js';

export const getChallenges = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ getChallenges: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const result = await query(
            'SELECT * FROM challenges WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        // Always return an object with challenges array, even if empty
        const challenges = result?.rows || [];
        console.log(`✅ getChallenges: Returning ${challenges.length} challenges for user ${userId}`);
        res.json({ challenges });
    } catch (error) {
        console.error('Get challenges error:', error);
        // Always return proper structure even on error
        res.status(500).json({ error: 'Failed to fetch challenges', challenges: [] });
    }
};

export const createChallenge = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ createChallenge: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { id, title, description, theory, duration, current_day, daily_tasks, quizzes, achievements, color } = req.body;

        const result = await query(
            `INSERT INTO challenges (id, user_id, title, description, theory, duration, current_day, daily_tasks, quizzes, achievements, color)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                id,
                userId,
                title || '',
                description || '',
                theory || '',
                duration || 0,
                current_day || 0,
                daily_tasks || '[]',
                quizzes || '[]',
                achievements || '[]',
                color || ''
            ]
        );

        res.json({ challenge: result?.rows[0] || null });
    } catch (error) {
        console.error('Create challenge error:', error);
        res.status(500).json({ error: 'Failed to create challenge' });
    }
};

export const updateChallenge = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ updateChallenge: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { current_day, daily_tasks, quizzes, achievements } = req.body;

        const result = await query(
            `INSERT INTO challenges (id, user_id, title, description, theory, duration, current_day, daily_tasks, quizzes, achievements, color)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id, user_id) 
             DO UPDATE SET
                 current_day = COALESCE($7, challenges.current_day),
                 daily_tasks = COALESCE($8, challenges.daily_tasks),
                 quizzes = COALESCE($9, challenges.quizzes),
                 achievements = COALESCE($10, challenges.achievements)
             RETURNING *`,
            [
                id,
                userId,
                req.body.title || '',
                req.body.description || '',
                req.body.theory || '',
                req.body.duration || 0,
                current_day,
                JSON.stringify(daily_tasks),
                JSON.stringify(quizzes),
                JSON.stringify(achievements),
                req.body.color || ''
            ]
        );

        res.json({ challenge: result?.rows[0] || null });
    } catch (error) {
        console.error('Update challenge error:', error);
        res.status(500).json({ error: 'Failed to update challenge' });
    }
};
