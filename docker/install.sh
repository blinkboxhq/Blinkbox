#!/bin/sh
# Blinkbox self-hosted installer (Linux).
#
#   curl -fsSL https://raw.githubusercontent.com/blinkboxhq/Blinkbox/main/docker/install.sh | sudo sh
#
# Asks for a license key, a name, an owner email and where the data should live,
# then brings the whole stack up on <name>.blinkbox.net with a certificate and
# prints the owner password once.
#
# Unattended — `sudo env`, not `VAR=x sudo`, because sudo drops the environment:
#
#   curl -fsSL .../install.sh | sudo env \
#     BLINKBOX_LICENSE_KEY=bb_xxx \
#     BLINKBOX_NAME=acme \
#     BLINKBOX_OWNER_EMAIL=you@acme.com \
#     BLINKBOX_STORAGE=local sh
set -eu

CLOUD_API_URL="${CLOUD_API_URL:-https://api.blinkbox.net}"
INSTALL_DIR="${BLINKBOX_DIR:-/opt/blinkbox}"

# The repo is public, so raw.githubusercontent.com serves these three files with
# no DNS of ours in the path. BLINKBOX_ASSET_BASE overrides it with a flat mirror
# that keeps docker-compose.yml, Caddyfile and install.sh at its root.
RAW_BASE="https://raw.githubusercontent.com/blinkboxhq/Blinkbox/main"
if [ -n "${BLINKBOX_ASSET_BASE:-}" ]; then
  INSTALL_URL="$BLINKBOX_ASSET_BASE/install.sh"
  COMPOSE_URL="$BLINKBOX_ASSET_BASE/docker-compose.yml"
  CADDY_URL="$BLINKBOX_ASSET_BASE/Caddyfile"
else
  INSTALL_URL="$RAW_BASE/docker/install.sh"
  COMPOSE_URL="$RAW_BASE/docker-compose.yml"
  CADDY_URL="$RAW_BASE/docker/Caddyfile"
fi

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

[ "$(id -u)" -eq 0 ] || die "Run as root:  curl -fsSL $INSTALL_URL | sudo sh"
[ "$(uname -s)" = "Linux" ] || die "This installer supports Linux only."
case "$(uname -m)" in
  x86_64|amd64) ;;
  # Say so here rather than letting `docker compose pull` fail with an opaque
  # "no matching manifest" — the images are published for linux/amd64 only.
  *) die "Blinkbox images are built for x86_64; this machine is $(uname -m)." ;;
esac
command -v curl >/dev/null 2>&1 || die "curl is required. Install it and re-run."

say ""
say "${BLD}Blinkbox${OFF} — self-hosted install"
say "${DIM}Your workflows run on this machine. Credits stay on your account.${OFF}"
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

  # Separate "key is wrong" from "the endpoint isn't there", or a cloud that has
  # not been deployed yet reads to the user as a bad key they cannot fix.
  LIC_CODE=$(curl -s -o /tmp/bb-lic.json -w '%{http_code}' -m 20 \
    -H "Authorization: Bearer $LICENSE_KEY" "$CLOUD_API_URL/api/self-host/status" || echo 000)
  BODY=$(cat /tmp/bb-lic.json 2>/dev/null || echo '')
  rm -f /tmp/bb-lic.json

  case "$BODY" in *'"valid":true'*) break ;; esac
  case "$LIC_CODE" in
    000) die "Cannot reach $CLOUD_API_URL. Check this box's DNS and outbound HTTPS." ;;
    404) die "$CLOUD_API_URL is running a build without the self-host API, so no key can be checked. Nothing to fix on this box." ;;
    5*)  die "$CLOUD_API_URL returned HTTP $LIC_CODE. Try again shortly." ;;
    401|403) printf '%s✗%s That key was rejected. Check it and paste again.\n' "$RED" "$OFF" ;;
    *)   printf '%s✗%s Unexpected reply (HTTP %s). Check the key and paste again.\n' "$RED" "$OFF" "$LIC_CODE" ;;
  esac
  LICENSE_KEY=""
  [ -n "$TTY" ] || exit 1
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
CADDY_SITE="$HOSTNAME_FQDN"
PUBLIC_URL="https://$HOSTNAME_FQDN"

# ── Owner ────────────────────────────────────────────────────────────────────

OWNER_EMAIL="${BLINKBOX_OWNER_EMAIL:-}"
while :; do
  if [ -z "$OWNER_EMAIL" ]; then
    say ""
    say "Which email owns this instance? ${DIM}(it identifies the account — you sign in with a password)${OFF}"
    ask "  email: "
    OWNER_EMAIL=$(printf '%s' "$REPLY_VALUE" | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')
  fi
  case "$OWNER_EMAIL" in
    ?*@?*.?*) break ;;
    *) printf '%s✗%s That does not look like an email address.\n' "$RED" "$OFF"; OWNER_EMAIL=""; [ -n "$TTY" ] || exit 1 ;;
  esac
done
ok "Owner: $OWNER_EMAIL"

# ── Storage ──────────────────────────────────────────────────────────────────

# The cloud says whether managed storage is real on this build. Offering a choice
# we cannot fulfil is worse than never showing it, so the option only appears
# when /status advertises it.
MANAGED_OFFERED=no
case "$BODY" in *'"managedStorage":true'*) MANAGED_OFFERED=yes ;; esac

STORAGE="${BLINKBOX_STORAGE:-}"
if [ -z "$STORAGE" ]; then
  if [ "$MANAGED_OFFERED" = yes ] && [ -n "$TTY" ]; then
    say ""
    say "Where should this instance keep its data?"
    say ""
    say "  ${BLD}1${OFF}  On this machine ${DIM}— Mongo and Redis run here, in Docker.${OFF}"
    say "     ${DIM}Nothing leaves the box, and the backups are yours.${OFF}"
    say "  ${BLD}2${OFF}  Blinkbox-managed ${DIM}— we run them, on credentials scoped to${OFF}"
    say "     ${DIM}this instance alone. Nothing to back up or upgrade.${OFF}"
    say ""
    ask "  choice [1]: "
    case "$REPLY_VALUE" in 2) STORAGE=managed ;; *) STORAGE=local ;; esac
  else
    STORAGE=local
  fi
fi

case "$STORAGE" in
  local|managed) ;;
  *) die "BLINKBOX_STORAGE must be 'local' or 'managed'." ;;
esac
if [ "$STORAGE" = managed ] && [ "$MANAGED_OFFERED" != yes ]; then
  die "Blinkbox-managed storage is not available yet. Re-run with BLINKBOX_STORAGE=local."
fi

# Empty profiles leave mongo and redis out of the project entirely.
if [ "$STORAGE" = local ]; then
  PROFILES=local
  ok "Data stays on this machine"
else
  PROFILES=""
  ok "Data managed by Blinkbox"
fi

# ── Files ────────────────────────────────────────────────────────────────────

step "Writing $INSTALL_DIR"
mkdir -p "$INSTALL_DIR/docker"
curl -fsSL "$COMPOSE_URL" -o "$INSTALL_DIR/docker-compose.yml" || die "Could not fetch docker-compose.yml from $COMPOSE_URL"
curl -fsSL "$CADDY_URL"   -o "$INSTALL_DIR/docker/Caddyfile"   || die "Could not fetch Caddyfile from $CADDY_URL"

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
SELF_HOST_STORAGE=$STORAGE
COMPOSE_PROFILES=$PROFILES
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
OWNER_EMAIL=$OWNER_EMAIL

BLINKBOX_HOSTNAME=$CADDY_SITE
BACKEND_PUBLIC_URL=$PUBLIC_URL
CORS_ORIGINS=$PUBLIC_URL

CLOUD_API_URL=$CLOUD_API_URL
ENVFILE
umask 022
ok "Config written"

# ── Up ───────────────────────────────────────────────────────────────────────

step "Starting Blinkbox ${DIM}(first run pulls a few images)${OFF}"
cd "$INSTALL_DIR"
docker compose pull --quiet || die "Could not pull the Blinkbox images from ghcr.io.
  Check this box's outbound HTTPS, then re-run. Nothing was started."
docker compose up -d || die "Startup failed. Logs:  cd $INSTALL_DIR && docker compose logs"

printf '%s' "  waiting for the engine "
i=0
while [ $i -lt 60 ]; do
  if docker compose exec -T backend node -e \
    "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; then break; fi
  printf '.'; sleep 3; i=$((i + 1))
done
say ""

ok "Blinkbox is running"

# The password is generated inside the container and reaches us only on stdout.
# It is never written to .env, never passed as an argument and never exported —
# so it exists in exactly one place: the screen below.
step "Creating the owner account"
set +e
OWNER_PASSWORD=$(docker compose exec -T backend node apps/backend/src/modules/selfhost/seedOwner.js)
SEED_CODE=$?
set -e

say ""
say "  ${BLD}$PUBLIC_URL${OFF}"
say ""

if [ $SEED_CODE -eq 0 ] && [ -n "$OWNER_PASSWORD" ]; then
  RULE="────────────────────────────────────────────────────────────"
  say "  $RULE"
  say "  ${BLD}Your password — shown once, right now${OFF}"
  say ""
  say "      ${BLD}$OWNER_PASSWORD${OFF}"
  say ""
  say "  ${DIM}Copy it before you close this window. It is stored only as a${OFF}"
  say "  ${DIM}hash, so nothing here or on the server can print it again, and${OFF}"
  say "  ${DIM}it stops working in 24 hours — sign in and pick your own.${OFF}"
  say "  $RULE"
  say ""
  say "  ${DIM}No email needed at sign-in: this instance already knows it${OFF}"
  say "  ${DIM}belongs to $OWNER_EMAIL.${OFF}"
elif [ $SEED_CODE -eq 3 ]; then
  say "  ${DIM}This instance already has an owner — sign in with your existing password.${OFF}"
  say "  ${DIM}Forgotten it?  cd $INSTALL_DIR && docker compose exec backend node apps/backend/src/modules/selfhost/resetOwner.js${OFF}"
else
  printf '%s✗%s Could not create the owner account.\n' "$RED" "$OFF"
  say "  ${DIM}Retry:  cd $INSTALL_DIR && docker compose exec backend node apps/backend/src/modules/selfhost/seedOwner.js${OFF}"
fi

say ""
say "  ${DIM}Certificates are issued on first visit; give it a few seconds.${OFF}"
say ""
say "  ${DIM}logs     cd $INSTALL_DIR && docker compose logs -f${OFF}"
say "  ${DIM}upgrade  cd $INSTALL_DIR && docker compose pull && docker compose up -d${OFF}"
say ""
