import { query } from '../config/database.js';

/**
 * Migration: Add completed_at field to tasks table
 */
export async function up(): Promise<void> {
    console.log('Running migration 003: Add completed_at to tasks table...');

    try {
        // Add completed_at column to tasks table
        await query(`
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;
        `);
        console.log('✅ Added completed_at column to tasks table');

        // Create index on completed_at for better performance
        await query(`
            CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
        `);
        console.log('✅ Created index on completed_at column');

    } catch (error) {
        console.error('❌ Migration 003 failed:', error);
        throw error;
    }
}

export async function down(): Promise<void> {
    console.log('Rolling back migration 003...');

    try {
        // Drop index first
        await query(`DROP INDEX IF EXISTS idx_tasks_completed_at;`);

        // Drop column
        await query(`ALTER TABLE tasks DROP COLUMN IF EXISTS completed_at;`);

        console.log('✅ Migration 003 rolled back');
    } catch (error) {
        console.error('❌ Rollback of migration 003 failed:', error);
        throw error;
    }
}