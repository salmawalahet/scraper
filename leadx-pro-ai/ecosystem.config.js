module.exports = {
  apps: [
    {
      name: 'leadx-backend',
      script: './apps/backend/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'leadx-frontend',
      script: 'npx',
      args: 'serve -s ./apps/frontend/dist -l 5173',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
