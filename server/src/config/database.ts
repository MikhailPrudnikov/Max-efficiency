import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

/**
 * PostgreSQL connection pool configuration
 * Supports both DATABASE_URL and individual connection parameters
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

// Add connection pool settings
const pool = new Pool({
    ...poolConfig,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Test database connection
 * Returns true if connection is successful, false otherwise
 */
export async function testConnection(): Promise<boolean> {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ PostgreSQL connection established successfully');
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error);
        return false;
    }
}

/**
 * Execute a query with error handling
 * Returns null on error to prevent crashes
 */
export async function query<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<pg.QueryResult<T> | null> {
    try {
        return await pool.query<T>(text, params);
    } catch (error) {
        console.error('Database query error:', error);
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
        console.error('Failed to get database client:', error);
        return null;
    }
}

/**
 * Close all connections in the pool
 * Should be called on application shutdown
 */
export async function closePool(): Promise<void> {
    await pool.end();
    console.log('PostgreSQL connection pool closed');
}

export default pool;