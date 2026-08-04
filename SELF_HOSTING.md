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

- Docker and Docker Compose
- ~4 GB RAM (Chromium for the scraper nodes is the heavy part)
- A Blinkbox account on any paid plan

## Install

```bash
git clone https://github.com/your-org/blinkbox.git
cd blinkbox

cp docker/env.example .env
```

Fill in `.env`:

1. **License key** — blinkbox.net → Settings → Self-hosting → *Create license*.
   It is shown once. Paste it into `SELF_HOST_LICENSE_KEY`.
2. **Secrets** — generate your own, they never leave your install:
   ```bash
   openssl rand -hex 32   # → JWT_SECRET
   openssl rand -hex 16   # → ENCRYPTION_KEY (must be exactly 32 chars)
   ```

Then:

```bash
docker compose up -d
```

Open **http://localhost:8080**. You land on the sign-in screen — create an
account, and it lives in your local database. There is no marketing site and no
social sign-in on a self-hosted install.

## Putting it on a domain

The frontend inlines the API URL when it is built, so changing the address
means rebuilding:

```bash
# .env
BACKEND_PUBLIC_URL=https://blinkbox.yourcompany.com/api
CORS_ORIGINS=https://blinkbox.yourcompany.com
```

```bash
docker compose up -d --build
```

Terminate TLS at your own reverse proxy in front of the `frontend` service.

## Upgrading

```bash
git pull
docker compose up -d --build
```

Your data lives in the `mongo-data` and `redis-data` volumes and survives
rebuilds.

## Backups

```bash
docker compose exec mongo mongodump --archive=/tmp/bb.gz --gzip --db blinkbox
docker compose cp mongo:/tmp/bb.gz ./blinkbox-backup.gz
```

Keep `ENCRYPTION_KEY` with your backups. Without it, stored integration
credentials cannot be decrypted from a restore.

## Troubleshooting

**"Self-hosted license key is invalid or revoked"** — the key was revoked, or
`SELF_HOST_LICENSE_KEY` is mistyped. Mint a fresh one and
`docker compose up -d` again.

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
