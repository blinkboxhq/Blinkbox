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
curl -fsSL https://get.blinkbox.net/install.sh | sudo sh
```

It asks two things:

```
? Paste your license key
> bb_selfhost_••••••••••••••••••••
✓ License valid — Pro plan

? Choose a name for this instance
> acme
✓ Reserved acme.blinkbox.net → 203.0.113.9
✓ Blinkbox is running

  https://acme.blinkbox.net
```

That is the whole install. The name reserves `<name>.blinkbox.net`, the DNS A
record is created for you, and Caddy issues the certificate on first visit. If
the name is already taken it becomes `<name>-v2`, `-v3`, and so on.

Open the URL and create your account — it lives in the database on your machine.
There is no marketing site and no social sign-in on a self-hosted install.

Everything lands in `/opt/blinkbox`: `docker-compose.yml`, `docker/Caddyfile`
and a `.env` holding your license key and the two secrets the installer
generated. **Keep that `.env`.**

### Non-interactive install

```bash
BLINKBOX_LICENSE_KEY=bb_selfhost_… BLINKBOX_NAME=acme \
  sh -c "$(curl -fsSL https://get.blinkbox.net/install.sh)"
```

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

## Licensing

Blinkbox is proprietary software (see `LICENSE`). A self-hosted install is
licensed to the account that issued the license key. Up to 5 active licenses
per account; revoke unused ones from the dashboard.
