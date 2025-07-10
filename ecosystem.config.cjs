module.exports = {
  apps: [
    {
      name: 'eliza-agent',
      cwd: '/var/www/eliza',
      script: 'elizaos',
      args: 'start --character="characters/evolucia.character.json"',
      env: {
        NODE_ENV: 'production',
        SERVER_PORT: 3000
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '3G',
    },
    // {
    //   name: 'eliza-client',
    //   cwd: '/var/www/eliza',
    //   script: 'pnpm',
    //   args: 'start:client --port 5173',
    //   env: {
    //     VITE_SERVER_BASE_URL: 'https://api.evolucia.com'
    //   },
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: '1G',
    // }
  ]
};
