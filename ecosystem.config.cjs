module.exports = {
    apps: [
        {
            name: 'maxflow-backend',
            cwd: '/usr/local/src/lovable_max/new_version/maxflow-zen-49451/server',
            script: 'dist/index.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            error_file: '/var/log/pm2/maxflow-backend-error.log',
            out_file: '/var/log/pm2/maxflow-backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        },
        {
            name: 'maxflow-bot',
            cwd: '/usr/local/src/lovable_max/new_version/maxflow-zen-49451/bot',
            script: 'dist/bot.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production'
            },
            error_file: '/var/log/pm2/maxflow-bot-error.log',
            out_file: '/var/log/pm2/maxflow-bot-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        }
    ]
};