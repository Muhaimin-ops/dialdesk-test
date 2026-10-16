// PM2 (bare VPS without Docker):  npm ci && npm run build && pm2 start ecosystem.config.cjs && pm2 save
// `next start` loads .env automatically, so keep your secrets in ./.env on the server.
module.exports = {
  apps: [
    {
      name: 'dialdesk',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production' },
      instances: 1, // the in-memory rate limiter is per process; see src/lib/ratelimit.ts
      max_memory_restart: '600M',
      autorestart: true,
    },
  ],
};
