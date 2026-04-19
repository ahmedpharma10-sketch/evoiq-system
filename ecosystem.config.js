module.exports = {
  apps: [
    {
      name: 'corpmanagesys',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/corpmanagesys',  // Update this path to match your installation directory
      env_file: '.env',  // Explicitly load environment variables from .env file
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/corpmanagesys-error.log',
      out_file: '/var/log/pm2/corpmanagesys-out.log',
      log_file: '/var/log/pm2/corpmanagesys-combined.log',
      time: true,
      // IMPORTANT: All environment variables (NODE_ENV, PORT, COMPANIES_HOUSE_API_KEY, SESSION_SECRET)
      // are loaded from the .env file specified above
      // DO NOT hard-code sensitive values here - always use the .env file
    },
  ],
};
