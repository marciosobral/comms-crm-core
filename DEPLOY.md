# Deploy

Single server running Docker Compose: Postgres, API, web, Caddy (HTTPS) and a daily backup.
The app is served at `https://DOMAIN` and the API at `https://DOMAIN/api`.

## Requirements

- Linux server with Docker and the Compose plugin.
- Ports 80 and 443 open.
- A DNS `A` record for `DOMAIN` pointing at the server (Caddy needs it to issue the certificate).

## First deploy

```sh
git clone <repo> crm && cd crm
cp .env.production.example .env
# Fill in .env: DOMAIN, POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, SEED_ADMIN_*.
docker compose up -d --build
docker compose exec api pnpm db:seed
```

Migrations run automatically every time the API container starts.
Log in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` and change the password right away.

## Updating

```sh
git pull
docker compose up -d --build
```

## Backups

- Every day at `BACKUP_TIME` (default 03:00, Brasília time) the `backup` service writes
  `backups/db-<stamp>.dump` and `backups/uploads-<stamp>.tar.gz`, keeping `BACKUP_KEEP_DAYS` days.
- Run one on demand: `docker compose exec backup sh /usr/local/bin/backup.sh now`.
- The `backups/` folder is on the same server. Copy it somewhere else (another machine, object
  storage or provider snapshots), otherwise losing the server loses the backups too.

### Restore

```sh
docker compose stop api
docker compose exec backup sh -c 'dropdb -h db -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" && createdb -h db -U "$POSTGRES_USER" "$POSTGRES_DB" && pg_restore -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner /backups/db-<stamp>.dump'
docker compose run --rm --entrypoint sh -v ./backups:/backups api -c 'tar -xzf /backups/uploads-<stamp>.tar.gz -C /data'
docker compose start api
```

## Logs

- `docker compose logs -f api` (also written to the `logs` volume as `app.log` / `error.log`).
- `docker compose logs -f caddy` for HTTPS and proxy issues.

## Notes

- Run a single API container: the due-date job, the import lock and uploads assume one process.
- The API runs in `America/Sao_Paulo` (set in its image); the due-date job fires at 08:00 local time.
