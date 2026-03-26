# Traditional Deployment

This page documents the current host-based deployment flow for OpenChat without Docker.

## Requirements

- Node.js 18+
- npm
- PostgreSQL 15+
- Redis 7+
- `psql` available in `PATH`
- Linux `systemd` if you want service management

## Recommended Command

For a Linux server deployment managed by `systemd`, use:

```bash
./scripts/deploy-server.sh production --db-action auto --yes --service
```

This command will:

- run standalone prechecks
- prepare `.env`
- install dependencies
- build the backend
- choose database `init` or `patch` automatically
- generate `etc/openchat.service`
- install and restart `/etc/systemd/system/openchat.service`

## Database Notes

`--db-action auto` behaves like this:

- `init` when the target database or core OpenChat tables do not exist
- `patch` when an existing OpenChat schema is detected

The database user configured in `.env` must be able to connect to PostgreSQL. If you want `db init` to create the database automatically, grant that user `CREATEDB`, or create the database manually first.

## Manual Commands

If you want to control each phase yourself:

```bash
./scripts/precheck.sh --mode standalone
npm ci
npm run build
./scripts/init-database.sh production --yes
./scripts/apply-db-patches.sh production
./bin/openchat start --environment production --host 127.0.0.1 --port 7200
```

## Runtime Management

Repository runtime wrapper:

```bash
./bin/openchat start
./bin/openchat stop
./bin/openchat restart
./bin/openchat status
./bin/openchat health
```

Linux service management:

```bash
systemctl status openchat.service
systemctl restart openchat.service
systemctl enable openchat.service
```

## Health Checks

```bash
curl -f http://127.0.0.1:7200/health
curl -f http://127.0.0.1:7200/ready
```

## Next Steps

- [Installation](./installation.md)
- [Docker Deployment](./docker.md)
