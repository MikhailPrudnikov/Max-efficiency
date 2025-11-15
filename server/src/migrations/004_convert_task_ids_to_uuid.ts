import { query } from '../config/database.js';

/**
 * Migration: Convert existing integer task IDs to UUIDs
 * This migration handles the transition from integer IDs to UUID IDs
 */
export async function up(): Promise<void> {
    console.log('Running migration 004: Convert task IDs to UUID...');

    try {
        // Check if tasks table exists and has integer IDs
        const tableCheck = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'id'
        `);

        if (!tableCheck || tableCheck.rows.length === 0) {
            console.log('⚠️  Tasks table not found, skipping migration');
            return;
        }

        const idType = tableCheck.rows[0].data_type;
        console.log(`Current tasks.id type: ${idType}`);

        // If already UUID, skip
        if (idType === 'uuid') {
            console.log('✅ Tasks table already uses UUID for id, skipping migration');
            return;
        }

        // Create a backup table
        await query(`
            CREATE TABLE IF NOT EXISTS tasks_backup AS 
            SELECT * FROM tasks
        `);
        console.log('✅ Created backup table: tasks_backup');

        // Create new tasks table with UUID
        await query(`
            DROP TABLE IF EXISTS tasks CASCADE;
            
            CREATE TABLE tasks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id BIGINT NOT NULL DEFAULT 0,
                title TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                deadline TIMESTAMPTZ NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                tags TEXT[] NOT NULL DEFAULT '{}',
                subtasks JSONB NOT NULL DEFAULT '[]',
                call_link TEXT NOT NULL DEFAULT '',
                attachments TEXT[] NOT NULL DEFAULT '{}',
                completed BOOLEAN NOT NULL DEFAULT false,
                completed_at TIMESTAMPTZ NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            
            CREATE INDEX idx_tasks_user_id ON tasks(user_id);
            CREATE INDEX idx_tasks_deadline ON tasks(deadline);
        `);
        console.log('✅ Created new tasks table with UUID');

        // Migrate data from backup
        await query(`
            INSERT INTO tasks (user_id, title, description, deadline, priority, tags, subtasks, call_link, attachments, completed, completed_at, created_at, updated_at)
            SELECT user_id, title, description, deadline, priority, tags, subtasks, call_link, attachments, completed, completed_at, created_at, updated_at
            FROM tasks_backup
        `);
        console.log('✅ Migrated data to new tasks table');

        // Recreate trigger
        await query(`
            DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
            CREATE TRIGGER update_tasks_updated_at
                BEFORE UPDATE ON tasks
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('✅ Recreated update trigger');

        console.log('✅ Migration 004 completed successfully');
        console.log('⚠️  Note: Old integer task IDs have been replaced with new UUIDs');
        console.log('⚠️  Backup table "tasks_backup" contains original data');

    } catch (error) {
        console.error('❌ Migration 004 failed:', error);
        throw error;
    }
}

export async function down(): Promise<void> {
    console.log('Rolling back migration 004...');

    try {
        // Restore from backup if it exists
        const backupCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'tasks_backup'
            )
        `);

        if (backupCheck && backupCheck.rows[0].exists) {
            await query(`
                DROP TABLE IF EXISTS tasks CASCADE;
                ALTER TABLE tasks_backup RENAME TO tasks;
                
                CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
                CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
            `);
            console.log('✅ Restored tasks from backup');
        }
    } catch (error) {
        console.error('❌ Migration 004 rollback failed:', error);
        throw error;
    }

    console.log('✅ Migration 004 rolled back');
}