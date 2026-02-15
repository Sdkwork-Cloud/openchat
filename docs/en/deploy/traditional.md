# Traditional Deployment

## Requirements

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

## Deployment Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env file

# 3. Build
pnpm run build

# 4. Start
pnpm start
```

## Using PM2

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start dist/main.js --name openchat-server

# View status
pm2 status

# View logs
pm2 logs openchat-server
```

## Systemd Service

Create `/etc/systemd/system/openchat.service`:

```ini
[Unit]
Description=OpenChat Server
After=network.target

[Service]
Type=simple
User=openchat
WorkingDirectory=/opt/openchat
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
systemctl enable openchat
systemctl start openchat
```

## Next Steps

- [Configuration](../config/) - Server configuration
- [Docker Deployment](./docker.md) - Docker deployment
