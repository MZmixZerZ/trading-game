/**
 * PM2 Configuration File for Streaming IdeaTrade Backend
 * 
 * PM2 is a production process manager for Node.js applications
 * Install: npm install -g pm2
 * 
 * Commands:
 * - Start: pm2 start ecosystem.config.js --env production
 * - Stop: pm2 stop streaming-ideatrade-server
 * - Restart: pm2 restart streaming-ideatrade-server
 * - Logs: pm2 logs streaming-ideatrade-server
 * - Monitor: pm2 monit
 * - Status: pm2 status
 * - Save: pm2 save (save process list)
 * - Startup: pm2 startup (auto-start on system reboot)
 */

module.exports = {
  apps: [
    {
      // Application name
      name: 'streaming-ideatrade-server',
      
      // Script to execute
      script: 'server.js',
      
      // Working directory
      cwd: './',
      
      // Node.js execution mode (fork for Socket.IO compatibility)
      exec_mode: 'fork',
      
      // Number of instances (1 for Socket.IO without Redis adapter)
      instances: 1,
      
      // Environment Configuration
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        SERVER_PORT: 5000,
        CLIENT_URL: 'http://localhost:3412',
        FRONTEND_URL: 'http://localhost:3412',
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
        SERVER_PORT: process.env.SERVER_PORT || process.env.PORT || 5000,
        HOST: '0.0.0.0',
        // Production environment variables
        CLIENT_URL: process.env.CLIENT_URL,
        FRONTEND_URL: process.env.FRONTEND_URL,
        PROXY_SERVER_URL: process.env.PROXY_SERVER_URL,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS
      },
      
      // Auto-restart if app crashes
      autorestart: true,
      
      // Watch for file changes (disable in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', '../client/build'],
      watch_options: {
        followSymlinks: false
      },
      
      // Maximum memory threshold (restart if exceeded)
      max_memory_restart: '1G',
      
      // Log configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      
      // Graceful shutdown settings
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Restart settings
      min_uptime: '10s',
      max_restarts: 10,
      
      // Environment Variables จาก .env
      env_file: '.env',
      
      // Additional PM2 settings for production
      append_env_to_name: true,
      
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Source map support
      source_map_support: true
    }
  ]
};              