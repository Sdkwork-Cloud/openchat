# OpenChat Server Installation Guide

## 1. System Requirements

- Windows 10/11 with WSL 2 enabled
- Ubuntu 22.04 (WSL)
- Node.js 18.x or higher
- PostgreSQL 18.x
- Redis 7.0+

## 2. Database Installation (WSL Ubuntu Environment)

### 2.1 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y
```

### 2.3 Start and Enable PostgreSQL Service

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.4 Verify Installation

```bash
sudo -u postgres psql -c "SELECT version();"
```

## 3. Database Initialization (If Database Already Installed)

### 3.1 Log in to PostgreSQL

Log in as postgres user:

```bash
sudo -u postgres psql
```

### 3.2 Create Database User

Create a dedicated database user for OpenChat:

```sql
-- Create user with password
CREATE USER openchat_user WITH PASSWORD 'openchat_password';

-- Grant superuser privileges (adjust for production environment)
ALTER USER openchat_user WITH SUPERUSER;
```

### 3.3 Create Database

Create OpenChat database and set owner:

```sql
-- Create database
CREATE DATABASE openchat OWNER openchat_user;

-- Exit PostgreSQL
\q
```

### 3.4 Verify Database and User

```bash
sudo -u postgres psql -c "\l"  -- List all databases
sudo -u postgres psql -c "\du" -- List all users
```

## 4. Database Authentication Configuration

### 4.1 Modify pg_hba.conf File

Edit PostgreSQL authentication configuration:

```bash
sudo nano /etc/postgresql/18/main/pg_hba.conf
```

Add the following configuration at the end of the file:

```
# OpenChat server connection configuration
host    openchat    openchat_user    0.0.0.0/0    scram-sha-256
host    openchat    openchat_user    ::/0         scram-sha-256
```

### 4.2 Modify postgresql.conf File

Edit PostgreSQL main configuration:

```bash
sudo nano /etc/postgresql/18/main/postgresql.conf
```

Modify the following settings:

```
# Listen on all network interfaces
listen_addresses = '*'

# Port setting (default 5432)
port = 5432
```

### 4.3 Restart PostgreSQL Service

```bash
sudo systemctl restart postgresql
```

## 5. Redis Installation

### 5.1 Install Redis

```bash
sudo apt install redis-server -y
```

### 5.2 Start and Enable Redis Service

```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 5.3 Verify Redis Installation

```bash
redis-cli ping
```

## 6. OpenChat Server Installation

### 6.1 Clone Repository

```bash
git clone https://github.com/yourusername/openchat.git
cd openchat
```

### 6.2 Install Dependencies

```bash
pnpm install
```

### 6.3 Configure Environment Variables

Copy and edit the environment configuration file:

```bash
cp .env .env.local
nano .env.local
```

Update the database configuration section:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=openchat_user
DB_NAME=openchat
DB_PASSWORD=openchat_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 6.4 Database Initialization

#### 6.4.1 Initialize Database Structure

```bash
# Initialize database structure as postgres user
sudo -u postgres psql -d openchat -f database/schema.sql

# Or using psql with explicit user
psql -U postgres -d openchat -f database/schema.sql
```

#### 6.4.2 Run Database Migrations (Optional)

```bash
# Run database migrations as postgres user
sudo -u postgres psql -d openchat -f database/migrations/001_add_fulltext_search.sql

# Or using psql with explicit user
psql -U postgres -d openchat -f database/migrations/001_add_fulltext_search.sql
```

#### 6.4.3 Insert Test Data (Optional)

```bash
# Insert test data as postgres user
sudo -u postgres psql -d openchat -f database/seed.sql

# Or using psql with explicit user
psql -U postgres -d openchat -f database/seed.sql
```

## 7. Start the Server

### 7.1 Development Mode

```bash
pnpm start:dev
```

### 7.2 Production Mode

```bash
pnpm build
pnpm start:prod
```

## 8. Verification

### 8.1 Check Server Status

Open your browser and navigate to `http://localhost:3000/health` to check if the server is running properly.

### 8.2 Test Database Connection

The server will automatically connect to the database during startup. Check the console logs for any database connection errors.

## 9. Troubleshooting

### 9.1 Common Errors

#### 9.1.1 Password Authentication Failed

**Error Message**: `password authentication failed for user "openchat_user"`

**Solution**:
1. Verify the password is correct
2. Check pg_hba.conf configuration
3. Reset user password:
   ```bash
   sudo -u postgres psql -c "ALTER USER openchat_user WITH PASSWORD 'new_password';"
   ```

#### 9.1.2 Connection Refused

**Error Message**: `connection refused`

**Solution**:
1. Ensure PostgreSQL service is running
2. Check listen_addresses configuration
3. Verify firewall settings

### 9.2 View PostgreSQL Logs

```bash
sudo tail -f /var/log/postgresql/postgresql-18-main.log
```

## 10. Backup and Restore

### 10.1 Database Backup

```bash
pg_dump -h localhost -U openchat_user -d openchat -F c -b -v -f openchat_backup.sql
```

### 10.2 Database Restore

```bash
pg_restore -h localhost -U openchat_user -d openchat -v openchat_backup.sql
```

## 11. Performance Optimization

### 11.1 PostgreSQL Configuration

Edit postgresql.conf:

```bash
sudo nano /etc/postgresql/18/main/postgresql.conf
```

Modify settings:

```
max_connections = 100
shared_buffers = 1GB
work_mem = 32MB
```

### 11.2 Redis Configuration

Edit redis.conf:

```bash
sudo nano /etc/redis/redis.conf
```

Modify settings:

```
maxmemory 1gb
maxmemory-policy allkeys-lru
```

## 12. Conclusion

This guide provides step-by-step instructions for installing and configuring the OpenChat server, including database setup and initialization. For more information, please refer to the official documentation.
