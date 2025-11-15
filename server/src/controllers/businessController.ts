import { Request, Response } from 'express';
import { query } from '../config/database.js';

// Orders
export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ getOrders: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const result = await query(
            'SELECT * FROM business_orders WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        res.json({ orders: result?.rows || [] });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders', orders: [] });
    }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ createOrder: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { client_name, description, status, price, deadline, linked_task_id } = req.body;

        const result = await query(
            `INSERT INTO business_orders (user_id, client_name, description, status, price, deadline, linked_task_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, client_name || '', description || '', status || 'новый', price || 0, deadline || '', linked_task_id || null]
        );

        res.json({ order: result?.rows[0] || null });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

export const updateOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ updateOrder: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { client_name, description, status, price, deadline, linked_task_id } = req.body;

        const result = await query(
            `UPDATE business_orders 
             SET client_name = COALESCE($1, client_name),
                 description = COALESCE($2, description),
                 status = COALESCE($3, status),
                 price = COALESCE($4, price),
                 deadline = COALESCE($5, deadline),
                 linked_task_id = $6
             WHERE id = $7 AND user_id = $8
             RETURNING *`,
            [client_name, description, status, price, deadline, linked_task_id, id, userId]
        );

        if (!result || result.rows.length === 0) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        res.json({ order: result.rows[0] });
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
};

// Reviews
export const getReviews = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ getReviews: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const result = await query(
            'SELECT * FROM business_reviews WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        res.json({ reviews: result?.rows || [] });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews', reviews: [] });
    }
};

export const createReview = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).maxUserId;
        if (!userId) {
            console.error('❌ createReview: No maxUserId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { client_name, rating, comment, date } = req.body;

        const result = await query(
            `INSERT INTO business_reviews (user_id, client_name, rating, comment, date)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, client_name || '', rating || 0, comment || '', date || new Date().toISOString().split('T')[0]]
        );

        res.json({ review: result?.rows[0] || null });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
};
