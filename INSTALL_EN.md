# OpenChat Server Installation Guide (English)

This guide matches the current repository scripts and command set, covering both fresh setup and existing-environment upgrades.

## 1. Requirements

- OS: Linux / macOS / Windows (WSL2 recommended)
- Node.js: 18+
- PostgreSQL: 15+
- Redis: 7+
- Required commands: `npm`, `psql`, `redis-cli`

## 2. Install Base Dependencies (Ubuntu Example)

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib redis-server
```

Enable and start services:

```bash
sudo systemctl enable --now postgresql
sudo systemctl enable --now redis-server
```

Verify:

```bash
sudo -u postgres psql -c "SELECT version();"
redis-cli ping
```

## 3. Create Database and User

```bash
sudo -u postgres psql
```

Run:

```sql
CREATE USER openchat_user WITH PASSWORD 'change_this_password';
CREATE DATABASE openchat OWNER openchat_user;
\q
```

## 4. PostgreSQL Authentication / Remote Access (Optional)

Find config file paths instead of hardcoding PostgreSQL version directories:

```bash
sudo -u postgres psql -tAc "SHOW hba_file;"
sudo -u postgres psql -tAc "SHOW config_file;"
```

Update `pg_hba.conf`:

```conf
host    openchat    openchat_user    0.0.0.0/0    scram-sha-256
host    openchat    openchat_user    ::/0         scram-sha-256
```

Update `postgresql.conf`:

```conf
listen_addresses = '*'
port = 5432
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## 5. Clone and Install

```bash
git clone <your-openchat-repo-url> openchat-server
cd openchat-server
npm install
```

If your local folder name differs from `openchat-server`, use the actual folder.

## 6. Configure Environment

For development, copy the example file:

```bash
cp .env.example .env.development
```

Edit `.env.development` and confirm at least:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=openchat_user
DB_PASSWORD=change_this_password
DB_NAME=openchat

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 7. Initialize Database (Fresh Database)

Linux / macOS:

```bash
chmod +x scripts/init-database.sh
./scripts/init-database.sh development
```

Windows PowerShell:

```powershell
.\scripts\init-database.ps1 -Environment development
```

Notes:

- The script applies `database/schema.sql`
- In non-production, you can choose whether to apply `database/seed.sql`
- Environment aliases are supported: `dev|development`, `test`, `prod|production`

## 8. Upgrade Existing Database (Online Patches)

Always apply patches before releasing a new backend version:

Linux / macOS:

```bash
./scripts/apply-db-patches.sh production
```

Windows PowerShell:

```powershell
.\scripts\apply-db-patches.ps1 -Environment production
```

Notes:

- Patch source: `database/patches/*.sql`
- Tracking table: `chat_schema_migrations`
- Idempotent behavior: already applied patches are skipped

## 9. Start the Server

Development:

```bash
npm run start:dev
```

Production:

```bash
npm run build
npm run start:prod
```

## 10. Validate Installation

```bash
curl -f http://localhost:3000/health
```

Optional:

```bash
./scripts/health-check.sh
```

Swagger endpoint:

- `http://localhost:3000/im/v3/docs`

## 11. Troubleshooting

### 11.1 `password authentication failed`

```bash
sudo -u postgres psql -c "ALTER USER openchat_user WITH PASSWORD 'new_password';"
```

Then update `DB_PASSWORD` in your `.env.*` file.

### 11.2 `connection refused`

Check service status and ports:

```bash
sudo systemctl status postgresql
sudo systemctl status redis-server
ss -lntp | rg '5432|6379|3000'
```

### 11.3 `psql: command not found`

Install PostgreSQL client and ensure it is in PATH:

```bash
command -v psql
```

## 12. Backup and Restore

Backup:

```bash
pg_dump -h localhost -U openchat_user -d openchat -F c -b -v -f openchat_backup.dump
```

Restore:

```bash
pg_restore -h localhost -U openchat_user -d openchat -v openchat_backup.dump
```

## 13. Related Docs

- Deployment guide: `DEPLOYMENT.md`
- Database guide: `database/README.md`
- Command handbook (CN): `docs/COMMANDS_CN.md`

