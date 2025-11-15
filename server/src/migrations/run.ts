import { testConnection } from '../config/database.js';
import * as migration001 from './001_create_users_table.js';
import * as migration002 from './002_create_app_tables.js';
import * as migration003 from './003_add_completed_at_to_tasks.js';
import * as migration004 from './004_convert_task_ids_to_uuid.js';

/**
 * Migration runner
 * Executes all migrations in order
 */
async function runMigrations(): Promise<void> {
    console.log('🚀 Starting database migrations...\n');

    // Test database connection first
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Cannot run migrations: Database connection failed');
        process.exit(1);
    }

    try {
        // Run migrations in order
        await migration001.up();
        await migration002.up();
        await migration003.up();
        await migration004.up();

        console.log('\n✅ All migrations completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations();
}

export { runMigrations };