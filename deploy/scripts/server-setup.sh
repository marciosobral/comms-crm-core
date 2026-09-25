#!/usr/bin/env bash
# Prepares a fresh Ubuntu 24.04 server for client instances. Safe to run again.
#   ssh root@<server> 'bash -s' -- <code-repo-url> <clients-repo-url> < deploy/scripts/server-setup.sh
# Repo URLs are https:// (public) or git@github.com:<owner>/<repo>.git (private, read-only deploy key).
set -euo pipefail

code_repo=${1:?code repo URL required}
clients_repo=${2:?clients repo URL required}
ROOT=/opt/crm
export DEBIAN_FRONTEND=noninteractive

echo "== system"
timedatectl set-timezone America/Sao_Paulo
apt-get update -qq
apt-get -y -qq -o Dpkg::Options::="--force-confold" upgrade >/dev/null
apt-get install -y -qq ufw unattended-upgrades ca-certificates curl git openssl >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades

cat > /etc/ssh/sshd_config.d/00-hardening.conf <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
CONF
sshd -t && systemctl reload ssh

ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
for rule in OpenSSH 80/tcp 443/tcp 443/udp; do ufw allow "$rule" >/dev/null; done
ufw --force enable >/dev/null

echo "== docker"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  # shellcheck source=/dev/null
  codename=$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
  cat > /etc/apt/sources.list.d/docker.sources <<SRC
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $codename
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
SRC
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
fi

echo "== repository access"
mkdir -p "$ROOT"/{clients,proxy/sites,instances} /root/.ssh
touch /root/.ssh/config
ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null
sort -u -o /root/.ssh/known_hosts /root/.ssh/known_hosts

# GitHub accepts a deploy key on one repository only, so each private repo gets its own key and
# an SSH host alias that selects it; the URL is rewritten to use that alias.
repo_url() {
  local url=$1 alias=$2
  case "$url" in
    git@github.com:*)
      local key="/root/.ssh/$alias"
      [ -f "$key" ] || ssh-keygen -t ed25519 -f "$key" -N "" -C "$(hostname)-$alias" -q
      grep -q "^Host $alias$" /root/.ssh/config || printf 'Host %s\n  HostName github.com\n  IdentityFile %s\n  IdentitiesOnly yes\n\n' "$alias" "$key" >> /root/.ssh/config
      echo "${url/git@github.com:/git@$alias:}"
      ;;
    *) echo "$url" ;;
  esac
}
code_url=$(repo_url "$code_repo" github-code)
clients_url=$(repo_url "$clients_repo" github-clients)
echo "$code_url" > "$ROOT/code-repo-url"

missing_access=0
for pair in "$code_url|github-code" "$clients_url|github-clients"; do
  url=${pair%%|*}
  alias=${pair##*|}
  if ! git ls-remote "$url" >/dev/null 2>&1; then
    missing_access=1
    echo "No read access to $url. Add this read-only deploy key to that repository:"
    cat "/root/.ssh/$alias.pub"
  fi
done
if [ "$missing_access" = 1 ]; then
  echo "Then run server-setup.sh again."
  exit 1
fi

[ -d "$ROOT/clients/.git" ] || git clone --quiet "$clients_url" "$ROOT/clients"

echo "== proxy and deploy script"
tmp=$(mktemp -d)
git clone --quiet --depth 1 "$code_url" "$tmp/code"
cp "$tmp/code/deploy/proxy/docker-compose.yml" "$tmp/code/deploy/proxy/Caddyfile" "$ROOT/proxy/"
install -m 0755 "$tmp/code/deploy/scripts/crm-deploy" /usr/local/bin/crm-deploy
install -m 0755 "$tmp/code/deploy/scripts/client-add.sh" /usr/local/bin/crm-client-add
rm -rf "$tmp"

docker network inspect crm-proxy >/dev/null 2>&1 || docker network create crm-proxy >/dev/null
docker compose -f "$ROOT/proxy/docker-compose.yml" up -d

echo "== done. Add a client with: crm-client-add <client> <tag>"
