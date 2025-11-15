import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, validateEnv } from './config/env.js';
import { testConnection, closePool } from './config/database.js';
import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';
import businessRoutes from './routes/business.js';
import challengesRoutes from './routes/challenges.js';
import settingsRoutes from './routes/settings.js';

/**
 * Main server application for MAX mini-application
 * Provides PostgreSQL-backed user authentication and storage
 */

// Validate environment configuration
validateEnv();

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
    cors({
        origin: env.CORS_ORIGIN,
        credentials: true,
    })
);

// Body parsing middleware with increased limit for file attachments
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware with detailed information
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const requestId = Date.now().toString(36);

    console.log(`\n📨 [${requestId}] ${timestamp}`);
    console.log(`   ${req.method} ${req.path}`);
    console.log(`   Origin: ${req.headers.origin || 'not set'}`);
    console.log(`   User-Agent: ${req.headers['user-agent'] || 'not set'}`);

    // Log body for POST/PUT requests (but hide sensitive data)
    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.initData) {
            sanitizedBody.initData = `[${sanitizedBody.initData.length} chars]`;
        }
        console.log(`   Body:`, JSON.stringify(sanitizedBody, null, 2));
    }

    // Track response
    const originalSend = res.send;
    res.send = function (data: any) {
        console.log(`📤 [${requestId}] Response: ${res.statusCode}`);
        return originalSend.call(this, data);
    };

    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

/**
 * Start server
 */
async function startServer(): Promise<void> {
    try {
        // Test database connection
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.warn('⚠️  Database connection failed - server will start but authentication will not work');
            console.warn('⚠️  Please check your database configuration and ensure PostgreSQL is running');
        }

        // Start listening
        app.listen(env.PORT, () => {
            console.log('\n🚀 Server started successfully!');
            console.log(`📡 Listening on port ${env.PORT}`);
            console.log(`🌍 Environment: ${env.NODE_ENV}`);
            console.log(`🔗 CORS origin: ${env.CORS_ORIGIN}`);
            console.log(`💾 Database: ${dbConnected ? 'Connected' : 'Not connected'}`);
            console.log(`\n✅ Ready to accept requests\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down server...');

    try {
        await closePool();
        console.log('✅ Server shut down gracefully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    shutdown();
});

// Start the server
startServer();