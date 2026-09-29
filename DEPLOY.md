# Deploy

Each client runs as an isolated instance (its own database, volumes, secrets, domain and branding). Several instances can share one server behind a shared Caddy proxy that issues HTTPS certificates per domain. Releases are deployed by git tag.

## How it fits together

| Piece | Where | What |
|---|---|---|
| Code | this repository | generic app, `deploy/` stacks and scripts |
| Client identity | private `crm-clients` repo | `clients/<client>/{client.env, seed.json, branding/}`, no secrets |
| Secrets | `/opt/crm/instances/<client>/.env` on the server | database password, JWT secrets, system admin password |

Server layout:

```
/opt/crm/
  clients/                crm-clients clone (read-only deploy key)
  proxy/                  shared Caddy; sites/<client>.caddy per client
  instances/<client>/
    app/                  code checkout at the deployed tag
    .env                  secrets (root only)
    backups/              daily encrypted database dumps and uploads archives
    DEPLOYED              deployed tag and date
```

The example client folder is `clients/example/` in this repository.

## New server

Requirements: Ubuntu 24.04 with root SSH access by key.

```sh
ssh root@<server> 'bash -s' -- <code-repo-url> <clients-repo-url> < deploy/scripts/server-setup.sh
```

The script hardens the server (SSH keys only, firewall 22/80/443, automatic security updates, timezone America/Sao_Paulo), installs Docker, starts the shared proxy and installs `crm-deploy` and `crm-client-add`. For a private repository URL (`git@github.com:...`) it prints a read-only deploy key: add it to that repository and run the script again. It is safe to run more than once.

## New client

1. In `crm-clients`, add `clients/<client>/` (copy `clients/example/` from this repo): `client.env`, `seed.json`, `branding/`. `CLIENT` must match the folder name.
2. Point the DNS `A` record of `DOMAIN` at the server (DNS only, no proxy in front).
3. On the server: `crm-client-add <client> <tag>`.

`crm-client-add` generates the secrets `.env` (never overwrites an existing one), adds the site to the proxy, builds and starts the stack, runs migrations and the seed, and prints how to read the admin password. The system admin (`SEED_ADMIN_EMAIL`, reference `9999`) cannot be edited in the app; its password lives only in that `.env`.

## Releases

- Push to `main` runs checks only (`.github/workflows/ci.yml`).
- Pushing a tag `vX.Y.Z` runs the checks and deploys the tag to every client in the `DEPLOY_TARGETS` secret, one at a time, stopping at the first failure (`.github/workflows/release.yml`).
- "Run workflow" on the Release workflow deploys a chosen tag to `all` or to a comma-separated list of clients.

Secrets: `DEPLOY_TARGETS` (`[{"client":"<client>","host":"<ip>"}]`), `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS` (fingerprints of every server). On each server the Actions key is limited in `/root/.ssh/authorized_keys` to `command="/usr/local/bin/crm-deploy",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty`.

By hand, on the server:

```sh
crm-deploy status                 # deployed tag per client
crm-deploy <client> <tag>         # deploy a tag
crm-deploy <client> <tag> --force # accept a tag with fewer migrations (see below)
```

A deploy updates `crm-clients`, checks out the tag, copies the client branding, rebuilds, waits for the API to be healthy (migrations run on API start), runs the seed and records the tag.

Going back to an older tag only works when no migration was added in between; otherwise the old code would run against a newer schema. `crm-deploy` refuses a tag with fewer migrations unless `--force` is given.

## Seed (`seed.json`)

`seed.json` lists domain values per type (`SALE_STATUS`, `PAYMENT_METHOD`, `MAILING`, `PDV`, `SYSTEM`, `PLAN_TYPE`, `SCHEDULE_PERIOD`) in display order. The seed runs on every deploy and only creates values that are missing; it never renames, reorders, deactivates or deletes existing ones. `SALE_DEFAULT_PDV` and `SALE_DEFAULT_SYSTEM` must be listed in it.

A value renamed in Configurações is created again with its old name on the next deploy, because the seed cannot tell a rename from a missing value. Rename it in `seed.json` too, or deactivate it instead of renaming.

## Branding

`client.env` sets `APP_NAME` (page titles and breadcrumbs); `branding/` holds `logo.png`, `logo-mark.jpg`, `favicon.png` and `apple-touch-icon.png`. Both are baked into the web build, so a change takes effect on the next deploy.

## Backups

Each instance's `backup` service writes `backups/db-<stamp>.dump.age` and `backups/uploads-<stamp>.tar.gz.age` daily at `BACKUP_TIME`, keeping `BACKUP_KEEP_DAYS` days. The files are encrypted with the client's `age` public key (`BACKUP_AGE_RECIPIENT`) and the `backups/` directory is mode 700. They stay on the same server: copy them elsewhere too (another machine, object storage or provider snapshots).

`BACKUP_AGE_RECIPIENT` is required: compose refuses to start the stack without it. **Every client's `client.env` must set it before the next tag deploy.** Generate the key pair on your own machine with `age-keygen -o backup-key.txt`, put the public key (`age1...`) in `client.env` and keep `backup-key.txt` off the server, in a password manager or other safe storage. Without the private key the backups cannot be restored, and anyone holding it can read them. Backups written before this change stay plaintext until `BACKUP_KEEP_DAYS` removes them; `client-add.sh` sets the directory to 700 on existing instances.

The commands below run from `/opt/crm/instances/<client>` with the same compose flags `crm-deploy` uses:

```sh
compose() { CLIENT_DIR=/opt/crm/clients/clients/<client> INSTANCE_DIR=$PWD docker compose -p <client> \
  --env-file /opt/crm/clients/clients/<client>/client.env --env-file .env \
  -f app/deploy/instance/docker-compose.yml "$@"; }
compose exec backup sh /usr/local/bin/backup.sh now
```

### Restore

Decrypt on a machine that holds the private key, then copy the decrypted files back to the server's `backups/` directory:

```sh
age -d -i backup-key.txt -o db-<stamp>.dump db-<stamp>.dump.age
age -d -i backup-key.txt -o uploads-<stamp>.tar.gz uploads-<stamp>.tar.gz.age
scp db-<stamp>.dump uploads-<stamp>.tar.gz <server>:/opt/crm/instances/<client>/backups/
```

Then, on the server, from the instance directory:

```sh
compose stop api
compose exec backup sh -c 'dropdb -h db -U crm --if-exists crm && createdb -h db -U crm crm && pg_restore -h db -U crm -d crm --no-owner /backups/db-<stamp>.dump'
compose run --rm -T --entrypoint sh -v "$PWD/backups:/restore" api -c 'tar -xzf /restore/uploads-<stamp>.tar.gz -C /data'
compose start api
```

Delete the decrypted files from `backups/` afterwards; they are plaintext (the next retention run also removes them after `BACKUP_KEEP_DAYS`).

## Logs

`compose logs -f api` for one client; `docker logs -f crm-proxy` for HTTPS and routing.

## Notes

- One API container per client: the due-date job, the import lock and uploads assume a single process.
- Each instance uses roughly 400-600 MB of RAM; size the server accordingly.
