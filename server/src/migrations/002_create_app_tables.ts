import { query } from '../config/database.js';

/**
 * Migration: Create application tables for tasks, business, challenges, and settings
 */
export async function up(): Promise<void> {
    console.log('Running migration 002: Create application tables...');

    try {
        // Create tasks table
        await query(`
            CREATE TABLE IF NOT EXISTS tasks (
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
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
        `);
        console.log('✅ Created tasks table');

        // Create business_orders table
        await query(`
            CREATE TABLE IF NOT EXISTS business_orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id BIGINT NOT NULL DEFAULT 0,
                client_name TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'новый',
                price NUMERIC NOT NULL DEFAULT 0,
                deadline TEXT NOT NULL DEFAULT '',
                linked_task_id UUID NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_business_orders_user_id ON business_orders(user_id);
        `);
        console.log('✅ Created business_orders table');

        // Create business_reviews table
        await query(`
            CREATE TABLE IF NOT EXISTS business_reviews (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id BIGINT NOT NULL DEFAULT 0,
                client_name TEXT NOT NULL DEFAULT '',
                rating INT NOT NULL DEFAULT 0,
                comment TEXT NOT NULL DEFAULT '',
                date TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_business_reviews_user_id ON business_reviews(user_id);
        `);
        console.log('✅ Created business_reviews table');

        // Create challenges table
        await query(`
            CREATE TABLE IF NOT EXISTS challenges (
                id TEXT NOT NULL,
                user_id BIGINT NOT NULL DEFAULT 0,
                title TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                theory TEXT NOT NULL DEFAULT '',
                duration INT NOT NULL DEFAULT 0,
                current_day INT NOT NULL DEFAULT 0,
                daily_tasks JSONB NOT NULL DEFAULT '[]',
                quizzes JSONB NOT NULL DEFAULT '[]',
                achievements JSONB NOT NULL DEFAULT '[]',
                color TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (id, user_id)
            );
            CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);
        `);
        console.log('✅ Created challenges table');

        // Create user_settings table
        await query(`
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id BIGINT PRIMARY KEY,
                integrations JSONB NOT NULL DEFAULT '{}',
                focus_mode JSONB NOT NULL DEFAULT '{}',
                calendar_settings JSONB NOT NULL DEFAULT '{}',
                theme TEXT NOT NULL DEFAULT 'system',
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);
        console.log('✅ Created user_settings table');

        // Create update trigger function
        await query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = now();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create triggers
        const tables = ['tasks', 'business_orders', 'challenges', 'user_settings'];
        for (const table of tables) {
            await query(`
                DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
                CREATE TRIGGER update_${table}_updated_at
                    BEFORE UPDATE ON ${table}
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            `);
        }
        console.log('✅ Created update triggers');

    } catch (error) {
        console.error('❌ Migration 002 failed:', error);
        throw error;
    }
}

export async function down(): Promise<void> {
    console.log('Rolling back migration 002...');
    
    const tables = ['tasks', 'business_orders', 'business_reviews', 'challenges', 'user_settings'];
    for (const table of tables) {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }
    await query(`DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;`);
    
    console.log('✅ Migration 002 rolled back');
}
