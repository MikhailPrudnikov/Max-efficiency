import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

/**
 * PostgreSQL connection pool configuration for bot
 * Uses same database as the main server
 * Matches server configuration structure
 */
const poolConfig: pg.PoolConfig = env.DATABASE_URL
    ? {
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool({
    ...poolConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
    console.error('❌ Unexpected error on idle PostgreSQL client', err);
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Bot PostgreSQL connection established successfully');
        return true;
    } catch (error) {
        console.error('❌ Bot PostgreSQL connection failed:', error);
        return false;
    }
}

/**
 * Execute a query with error handling
 */
export async function query<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<pg.QueryResult<T> | null> {
    try {
        return await pool.query<T>(text, params);
    } catch (error) {
        console.error('❌ Database query error:', error);
        console.error('Query:', text);
        console.error('Params:', params);
        return null;
    }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<pg.PoolClient | null> {
    try {
        return await pool.connect();
    } catch (error) {
        console.error('❌ Failed to get database client:', error);
        return null;
    }
}

/**
 * Close all connections in the pool
 */
export async function closePool(): Promise<void> {
    await pool.end();
    console.log('🔌 Bot PostgreSQL connection pool closed');
}

export default pool;