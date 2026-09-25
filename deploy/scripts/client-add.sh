#!/usr/bin/env bash
# Adds a client instance to this server and deploys a tag to it.
#   client-add.sh <client> <tag>
# Requires server-setup.sh, clients/<client>/ in crm-clients, and the DOMAIN A record pointing here.
set -euo pipefail

ROOT=${CRM_ROOT:-/opt/crm}
client=${1:-}
tag=${2:-}
[[ "$client" =~ ^[a-z0-9-]+$ ]] || { echo "usage: client-add.sh <client> <tag>"; exit 2; }
[[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "invalid tag (expected vX.Y.Z)"; exit 2; }

git -C "$ROOT/clients" pull --ff-only --quiet
client_env="$ROOT/clients/clients/$client/client.env"
[ -f "$client_env" ] || { echo "missing $client_env (add the client to crm-clients first)"; exit 2; }
env_value() { grep -E "^$1=" "$client_env" | head -1 | cut -d= -f2-; }
[ "$(env_value CLIENT)" = "$client" ] || { echo "CLIENT in $client_env must be $client"; exit 2; }
domain=$(env_value DOMAIN)
[ -n "$domain" ] || { echo "DOMAIN missing in $client_env"; exit 2; }

instance="$ROOT/instances/$client"
mkdir -p "$instance/backups"
if [ ! -d "$instance/app/.git" ]; then
  git clone --quiet "$(cat "$ROOT/code-repo-url")" "$instance/app"
fi

if [ ! -f "$instance/.env" ]; then
  (
    umask 077
    {
      echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
      echo "JWT_SECRET=$(openssl rand -hex 48)"
      echo "JWT_REFRESH_SECRET=$(openssl rand -hex 48)"
      echo "SEED_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-24)"
    } > "$instance/.env"
  )
  echo "generated secrets in $instance/.env"
else
  echo "keeping existing $instance/.env"
fi

cat > "$ROOT/proxy/sites/$client.caddy" <<SITE
$domain {
	encode zstd gzip
	handle_path /api/* {
		reverse_proxy $client-api:3001
	}
	handle {
		reverse_proxy $client-web:3000
	}
}
SITE
docker exec crm-proxy caddy reload --config /etc/caddy/Caddyfile

CRM_ROOT="$ROOT" "$(command -v crm-deploy || echo "$(dirname "$0")/crm-deploy")" "$client" "$tag"

echo
echo "Client $client is live at https://$domain"
echo "Admin: $(env_value SEED_ADMIN_EMAIL) (reference 9999). Password, from your own terminal:"
echo "  ssh <server> \"grep SEED_ADMIN_PASSWORD $instance/.env\""
