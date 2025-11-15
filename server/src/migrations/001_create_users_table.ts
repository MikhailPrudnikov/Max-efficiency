import { query } from '../config/database.js';

/**
 * Migration: Create users table with all fields having safe defaults
 * 
 * This migration creates the users table with:
 * - All text fields defaulting to empty strings (NOT NULL)
 * - Numeric fields defaulting to 0 or appropriate values
 * - Timestamps with automatic defaults
 * - Unique constraint on max_user_id for MAX user identification
 */
export async function up(): Promise<void> {
    console.log('Running migration: 001_create_users_table');

    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      max_user_id BIGINT NOT NULL DEFAULT 0 UNIQUE,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      username TEXT NOT NULL DEFAULT '',
      language_code TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NULL
    );
  `;

    const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_users_max_user_id ON users(max_user_id);
  `;

    const createUpdatedAtTriggerQuery = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

    try {
        await query(createTableQuery);
        console.log('✅ Users table created successfully');

        await query(createIndexQuery);
        console.log('✅ Index on max_user_id created successfully');

        await query(createUpdatedAtTriggerQuery);
        console.log('✅ Updated_at trigger created successfully');

        console.log('Migration 001_create_users_table completed successfully');
    } catch (error) {
        console.error('❌ Migration 001_create_users_table failed:', error);
        throw error;
    }
}

/**
 * Rollback migration
 */
export async function down(): Promise<void> {
    console.log('Rolling back migration: 001_create_users_table');

    const dropTableQuery = `
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    DROP FUNCTION IF EXISTS update_updated_at_column();
    DROP TABLE IF EXISTS users CASCADE;
  `;

    try {
        await query(dropTableQuery);
        console.log('✅ Users table dropped successfully');
        console.log('Rollback 001_create_users_table completed successfully');
    } catch (error) {
        console.error('❌ Rollback 001_create_users_table failed:', error);
        throw error;
    }
}