#!/bin/sh
# Blinkbox self-hosted installer (Linux).
#
#   curl -fsSL https://get.blinkbox.net/install.sh | sh
#
# Asks for a license key and a name, then brings the whole stack up on
# <name>.blinkbox.net with a certificate. Nothing else is required.
set -eu

CLOUD_API_URL="${CLOUD_API_URL:-https://api.blinkbox.net}"
ASSET_BASE="${BLINKBOX_ASSET_BASE:-https://get.blinkbox.net}"
INSTALL_DIR="${BLINKBOX_DIR:-/opt/blinkbox}"

RED=''; GRN=''; DIM=''; BLD=''; OFF=''
if [ -t 1 ]; then
  RED=$(printf '\033[31m'); GRN=$(printf '\033[32m'); DIM=$(printf '\033[2m')
  BLD=$(printf '\033[1m'); OFF=$(printf '\033[0m')
fi

say()  { printf '%s\n' "$*"; }
step() { printf '%s→%s %s\n' "$BLD" "$OFF" "$*"; }
ok()   { printf '%s✓%s %s\n' "$GRN" "$OFF" "$*"; }
die()  { printf '%s✗%s %s\n' "$RED" "$OFF" "$*" >&2; exit 1; }

# Piped through `sh`, so stdin is the script itself — prompts must read the tty.
TTY=/dev/tty
[ -r $TTY ] || TTY=""

ask() { # ask <prompt> <varname-of-default>
  _prompt=$1; _default=${2:-}
  if [ -n "$_default" ]; then printf '%s' "$_prompt"; printf '%s\n' "$_default"; REPLY_VALUE=$_default; return 0; fi
  [ -n "$TTY" ] || die "No terminal available. Set BLINKBOX_LICENSE_KEY and BLINKBOX_NAME and re-run."
  printf '%s' "$_prompt"
  IFS= read -r REPLY_VALUE < $TTY
}

# Minimal string pull from a JSON body — the installer must not need jq.
json_str() { printf '%s' "$1" | sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n1; }

rand_hex() { # rand_hex <bytes>
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex "$1"
  else tr -dc 'a-f0-9' < /dev/urandom | head -c $(( $1 * 2 )); fi
}

# ── Preflight ────────────────────────────────────────────────────────────────

[ "$(id -u)" -eq 0 ] || die "Run as root:  curl -fsSL $ASSET_BASE/install.sh | sudo sh"
[ "$(uname -s)" = "Linux" ] || die "This installer supports Linux only."
command -v curl >/dev/null 2>&1 || die "curl is required. Install it and re-run."

say ""
say "${BLD}Blinkbox${OFF} — self-hosted install"
say "${DIM}Your workflows and data stay on this machine. Credits stay on your account.${OFF}"
say ""

if ! command -v docker >/dev/null 2>&1; then
  step "Installing Docker"
  curl -fsSL https://get.docker.com | sh >/dev/null 2>&1 || die "Docker install failed. Install Docker, then re-run."
  ok "Docker installed"
fi
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required (docker compose)."
docker info >/dev/null 2>&1 || die "Docker is installed but not running. Start it and re-run."

# ── License ──────────────────────────────────────────────────────────────────

LICENSE_KEY="${BLINKBOX_LICENSE_KEY:-}"
while :; do
  if [ -z "$LICENSE_KEY" ]; then
    say "Paste your license key ${DIM}(blinkbox.net → Self-hosting)${OFF}"
    ask "  license key: "
    LICENSE_KEY=$(printf '%s' "$REPLY_VALUE" | tr -d '[:space:]')
  fi
  [ -n "$LICENSE_KEY" ] || continue

  BODY=$(curl -fsS -m 20 -H "Authorization: Bearer $LICENSE_KEY" "$CLOUD_API_URL/api/self-host/status" 2>/dev/null || true)
  case "$BODY" in
    *'"valid":true'*) break ;;
    *) printf '%s✗%s That key was rejected. Check it and paste again.\n' "$RED" "$OFF"; LICENSE_KEY=""; [ -n "$TTY" ] || exit 1 ;;
  esac
done

PLAN=$(json_str "$BODY" plan)
ok "License valid${PLAN:+ — $PLAN plan}"

# ── Name → DNS ───────────────────────────────────────────────────────────────

PUBLIC_IP="${BLINKBOX_IP:-}"
[ -n "$PUBLIC_IP" ] || PUBLIC_IP=$(curl -fsS -m 10 https://api.ipify.org 2>/dev/null || true)

NAME="${BLINKBOX_NAME:-}"
while :; do
  if [ -z "$NAME" ]; then
    say ""
    say "Choose a name for this instance ${DIM}(letters, numbers, dashes)${OFF}"
    ask "  name: "
    NAME=$(printf '%s' "$REPLY_VALUE" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')
  fi
  [ -n "$NAME" ] || continue

  CODE=$(curl -s -o /tmp/bb-reg.json -w '%{http_code}' -m 30 -X POST \
    -H "Authorization: Bearer $LICENSE_KEY" -H 'Content-Type: application/json' \
    -d "{\"name\":\"$NAME\",\"ip\":\"$PUBLIC_IP\"}" \
    "$CLOUD_API_URL/api/self-host/register" || true)
  REG=$(cat /tmp/bb-reg.json 2>/dev/null || echo '')
  rm -f /tmp/bb-reg.json

  [ "$CODE" = "201" ] && break
  printf '%s✗%s %s\n' "$RED" "$OFF" "$(json_str "$REG" message)"
  NAME=""
  [ -n "$TTY" ] || exit 1
done

HOSTNAME_FQDN=$(json_str "$REG" hostname)
FINAL_NAME=$(json_str "$REG" name)
DNS_STATE=$(json_str "$REG" dns)
[ "$FINAL_NAME" = "$NAME" ] || say "${DIM}  \"$NAME\" was taken — using \"$FINAL_NAME\"${OFF}"
ok "Reserved $HOSTNAME_FQDN → $PUBLIC_IP"
[ "$DNS_STATE" = "ok" ] || say "${DIM}  DNS record not created automatically — point $HOSTNAME_FQDN at $PUBLIC_IP yourself.${OFF}"

# ── Files ────────────────────────────────────────────────────────────────────

step "Writing $INSTALL_DIR"
mkdir -p "$INSTALL_DIR/docker"
curl -fsSL "$ASSET_BASE/docker-compose.yml" -o "$INSTALL_DIR/docker-compose.yml" || die "Could not fetch docker-compose.yml"
curl -fsSL "$ASSET_BASE/Caddyfile"          -o "$INSTALL_DIR/docker/Caddyfile"   || die "Could not fetch Caddyfile"

# Secrets are generated here and never leave this machine. Preserve them across
# re-runs: rotating ENCRYPTION_KEY makes stored credentials undecryptable.
if [ -f "$INSTALL_DIR/.env" ]; then
  JWT_SECRET=$(sed -n 's/^JWT_SECRET=//p' "$INSTALL_DIR/.env" | head -n1)
  ENCRYPTION_KEY=$(sed -n 's/^ENCRYPTION_KEY=//p' "$INSTALL_DIR/.env" | head -n1)
fi
JWT_SECRET="${JWT_SECRET:-$(rand_hex 32)}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(rand_hex 16)}"

umask 077
cat > "$INSTALL_DIR/.env" <<ENVFILE
# Generated by the Blinkbox installer. Keep this file — ENCRYPTION_KEY is the
# only thing that can decrypt your stored integration credentials.
SELF_HOST_LICENSE_KEY=$LICENSE_KEY
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

BLINKBOX_HOSTNAME=$HOSTNAME_FQDN
BACKEND_PUBLIC_URL=https://$HOSTNAME_FQDN
CORS_ORIGINS=https://$HOSTNAME_FQDN

CLOUD_API_URL=$CLOUD_API_URL
ENVFILE
umask 022
ok "Config written"

# ── Up ───────────────────────────────────────────────────────────────────────

step "Starting Blinkbox ${DIM}(first run pulls a few images)${OFF}"
cd "$INSTALL_DIR"
docker compose pull --quiet 2>/dev/null || true
docker compose up -d || die "Startup failed. Logs:  cd $INSTALL_DIR && docker compose logs"

printf '%s' "  waiting for the engine "
i=0
while [ $i -lt 60 ]; do
  if curl -fsS -m 3 "http://localhost:${BACKEND_PORT:-3000}/health" >/dev/null 2>&1; then break; fi
  printf '.'; sleep 3; i=$((i + 1))
done
say ""

say ""
ok "Blinkbox is running"
say ""
say "  ${BLD}https://$HOSTNAME_FQDN${OFF}"
say ""
say "  ${DIM}Create your account on that page — it lives in your database, here.${OFF}"
say "  ${DIM}Certificates are issued on first visit; give it a few seconds.${OFF}"
say ""
say "  ${DIM}logs     cd $INSTALL_DIR && docker compose logs -f${OFF}"
say "  ${DIM}upgrade  cd $INSTALL_DIR && docker compose pull && docker compose up -d${OFF}"
say ""
