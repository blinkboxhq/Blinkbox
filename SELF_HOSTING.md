# Self-hosting Blinkbox

Run the full Blinkbox engine on your own machine or server. Your workflows,
execution history and integration credentials stay in a database you control.
Your Blinkbox plan and credits come with you.

## What "self-hosted" means here

| Runs on your infrastructure | Stays with Blinkbox cloud |
|---|---|
| Workflow engine and all nodes | Credit metering and billing |
| Your workflows and execution logs | Your subscription and plan |
| Integration credentials (encrypted with your key) | License validation |
| MongoDB and Redis | — |

Node executions are metered exactly as they are on blinkbox.net. Your instance
asks the cloud whether your account can afford each node, runs it, then reports
the spend. Trigger nodes are free; everything else costs its normal credits.

Your license key is a bearer token for that credits API and nothing else. It
grants no access to any Blinkbox database, and no access to your account beyond
spending your own credits.

## Requirements

- A Linux server with a public IPv4 (Docker is installed for you if missing)
- ~4 GB RAM (Chromium for the scraper nodes is the heavy part)
- A Blinkbox account on any paid plan

## Install

Create a license key at **blinkbox.net → Self-host → New license**. It is shown
once. Then, on your server:

```bash
curl -fsSL https://raw.githubusercontent.com/blinkboxhq/Blinkbox/main/docker/install.sh | sudo sh
```

The installer pulls `docker-compose.yml` and `docker/Caddyfile` from the same
place, so this is the only URL involved. To serve it from a host of your own,
put all three files at one path and point `BLINKBOX_ASSET_BASE` at it:

```bash
BLINKBOX_ASSET_BASE=https://get.example.com \
  sh -c "$(curl -fsSL https://get.example.com/install.sh)"
```

It asks three things:

```
? Paste your license key
> bb_selfhost_••••••••••••••••••••
✓ License valid — Pro plan

? Choose a name for this instance
> acme
✓ Reserved acme.blinkbox.net → 203.0.113.9

? Which email owns this instance?
> you@acme.com
✓ Owner: you@acme.com

✓ Blinkbox is running

  https://acme.blinkbox.net

  ────────────────────────────────────────────────────────────
  Your password — shown once, right now

      k7Rmqx-Ta9vPd-3nHyWs-Zb6EjL

  Copy it before you close this window. It is stored only as a
  hash, so nothing here or on the server can print it again, and
  it stops working in 24 hours — sign in and pick your own.
  ────────────────────────────────────────────────────────────
```

That is the whole install. The name reserves `<name>.blinkbox.net`, the DNS A
record is created for you, and Caddy issues the certificate on first visit. If
the name is already taken it becomes `<name>-v2`, `-v3`, and so on.

### Signing in

The login page asks for a password and nothing else. Your instance has exactly
one account, so there is no email field to fill in — and none shown, which keeps
the address off a page anyone can load.

Paste the installer password, and the site immediately asks you to replace it
with one of your own (12+ characters, mixed case and a digit). That first
password is a delivery mechanism, not a credential: it only unlocks the
change-password screen, it cannot drive the rest of the API, and it stops being
accepted 24 hours after install so a stale terminal transcript is not a key to
your instance.

There is no sign-up form and no social sign-in on a self-hosted install. Both
are disabled server-side, not just hidden.

**If you lose the password**, there is no reset email — a self-hosted box has no
mail provider, and an email link would be a second way in. Recovery is proof of
control over the server instead:

```bash
cd /opt/blinkbox && docker compose exec backend node src/modules/selfhost/resetOwner.js
```

It prints a fresh one-time password and immediately invalidates every session
that was open, so a stolen login does not outlive the credential it came from.

Everything lands in `/opt/blinkbox`: `docker-compose.yml`, `docker/Caddyfile`
and a `.env` holding your license key and the two secrets the installer
generated. **Keep that `.env`.**

### Non-interactive install

```bash
BLINKBOX_LICENSE_KEY=bb_selfhost_… BLINKBOX_NAME=acme \
  BLINKBOX_OWNER_EMAIL=you@acme.com \
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/blinkboxhq/Blinkbox/main/docker/install.sh)"
```

The generated password is still printed once on stdout. Capture it there — it is
never written to `.env` and cannot be recovered afterwards.

## Using your own domain instead

Point your own A record at the box, then:

```bash
# /opt/blinkbox/.env
BLINKBOX_HOSTNAME=blinkbox.yourcompany.com
BACKEND_PUBLIC_URL=https://blinkbox.yourcompany.com
CORS_ORIGINS=https://blinkbox.yourcompany.com
```

```bash
cd /opt/blinkbox && docker compose up -d
```

No rebuild is needed — the frontend talks to whatever origin serves it.

## Upgrading

```bash
cd /opt/blinkbox && docker compose pull && docker compose up -d
```

Your data lives in the `mongo-data` and `redis-data` volumes and survives
upgrades.

## Backups

```bash
cd /opt/blinkbox
docker compose exec mongo mongodump --archive=/tmp/bb.gz --gzip --db blinkbox
docker compose cp mongo:/tmp/bb.gz ./blinkbox-backup.gz
```

Keep `ENCRYPTION_KEY` with your backups. Without it, stored integration
credentials cannot be decrypted from a restore.

## Troubleshooting

**"Self-hosted license key is invalid or revoked"** — the key was revoked, or
`SELF_HOST_LICENSE_KEY` in `/opt/blinkbox/.env` is mistyped. Mint a fresh one
and `docker compose up -d` again.

**The certificate never appears** — Caddy needs ports 80 and 443 reachable from
the internet for the ACME challenge, and DNS needs a moment to propagate. Check
your firewall and security groups, then `docker compose logs caddy`.

**"Cannot reach Blinkbox cloud to meter this node"** — your instance cannot
reach `api.blinkbox.net`. Executions pause rather than run unmetered, and
resume once connectivity returns. Check egress rules on port 443.

**"Credit quota exceeded"** — your Blinkbox account is out of credits. Top up
at blinkbox.net; the running instance picks it up on the next node.

**Scraper nodes fail** — Chromium needs more than the default container memory
on some hosts. Raise Docker's memory limit to at least 4 GB.

**"This setup password has expired"** — the installer password is only good for
24 hours. Issue a new one with `docker compose exec backend node
src/modules/selfhost/resetOwner.js`.

**"Too many attempts. Try again in N seconds."** — five wrong passwords starts a
lockout that backs off from 15 seconds to an hour, keyed on the client address.
Wait it out, or reset the password from the server to clear it.

## Licensing

Blinkbox is proprietary software (see `LICENSE`). A self-hosted install is
licensed to the account that issued the license key. Up to 5 active licenses
per account; revoke unused ones from the dashboard.
