# Blinkbox Self-Hosting — Manifest

> The single specification for self-hosting. Anything in the repo that
> contradicts this file is a defect, not an alternative. Written 2026-08-17
> after an audit found three overlapping systems, two of which could not boot.

---

## 1. The product, in one paragraph

A customer points a fresh Linux VPS at us. They run one command, answer four
questions, and get a working Blinkbox at `https://<name>.blinkbox.net` with a
real certificate, an owner account, and the credits their plan already carries.
They never register a domain, never sign up for a database, never edit a config
file. The VPS is compute they provide; the subdomain, the certificate, the
licensing and the metering are ours.

**One system. Two storage modes. No third path.**

| Mode | Chosen at install | Mongo + Redis | Data lives |
|------|-------------------|---------------|------------|
| `local` *(default)* | "On this machine" | compose services on the VPS | customer's disk |
| `managed` | "Blinkbox-managed" | our cluster, tenant-scoped | our infrastructure |

Everything else is identical between the two: one compose file, one image pair,
one installer, one set of endpoints, one code path. The mode is a single env var
and a compose profile — never a fork.

---

## 2. Invariants

Non-negotiable. A change that breaks one of these is wrong even if it passes.

1. **One durable secret on the VPS: the license key.** In `managed` mode the
   database credentials are fetched at boot, held in memory, and never written
   to disk, argv, or the compose environment.
2. **A tenant credential reaches that tenant's data and nothing else.**
   Mongo: a dedicated database with a user scoped to it. Redis: an ACL user
   restricted to one key prefix. A customer with root on their own VPS must not
   be able to read another customer's workflows or credentials.
3. **Caddy is the only public listener.** `backend` and `frontend` use `expose`,
   never `ports`. Nothing reaches the API except through Caddy's security
   headers and its `X-Forwarded-For` overwrite, which login lockouts depend on.
4. **The frontend has no hostname compiled into it.** `VITE_API_URL` is never
   set for a self-hosted build. One image serves every customer domain.
5. **Metering degrades, it does not cliff.** A successful check is cached; the
   instance keeps executing for `GRACE_HOURS` (default 72) while the cloud is
   unreachable, then fails closed. A blinkbox.net outage must not stop every
   customer's workflows.
6. **Revocation is total.** Revoking a license tears down the DNS record, drops
   the managed credential, and denies the next bootstrap and the next check.
7. **The owner password exists in exactly one place: the installer's stdout,
   once.** Never in `.env`, never in argv, never in an env var.
8. **Re-running the installer is an upgrade, never a reset.** `JWT_SECRET` and
   `ENCRYPTION_KEY` are preserved; a second owner is never minted.

---

## 3. Topology

```
                   customer VPS                          Blinkbox cloud
       ┌─────────────────────────────────┐        ┌──────────────────────────┐
 :443 ─┤ caddy   sole ingress, TLS       │        │ /api/self-host/*         │
       │   ├─ /api /socket.io /webhook   │◄──────►│   register · bootstrap   │
       │   │        → backend:3000       │        │   heartbeat · status     │
       │   └─ /*    → frontend:80        │        │   credits/* · cost/*     │
       │                                 │        │                          │
       │ backend    API + executor       │        │ Cloudflare DNS           │
       │ frontend   nginx, SPA           │        │ Mongo   [managed mode]   │
       │ mongo · redis   [local mode]    │        │ Redis   [managed mode]   │
       └─────────────────────────────────┘        └──────────────────────────┘
```

`apps/backend/Dockerfile.desktop` is **not** part of this system. It is the
Xvfb/xdotool container for the desktop-automation node pool
(`apps/backend/src/infra/desktop.pool.js`). Do not touch it during self-hosting
work; it has already been mistaken once for an install path.

---

## 4. Contracts

### 4.1 Files on the box — `/opt/blinkbox/`

```
/opt/blinkbox/
  docker-compose.yml     fetched from the repo, never hand-edited
  docker/Caddyfile       fetched from the repo
  .env                   written by the installer, mode 600
```

No source is ever placed here. The installer pulls images; it cannot build.

### 4.2 `.env` — the complete set

| Var | Written by | Notes |
|-----|-----------|-------|
| `SELF_HOST_LICENSE_KEY` | installer | the only durable secret |
| `SELF_HOST_STORAGE` | installer | `local` \| `managed` |
| `JWT_SECRET` | installer, generated | preserved across re-runs |
| `ENCRYPTION_KEY` | installer, generated | exactly 32 chars; preserved — rotating it orphans every saved credential |
| `OWNER_EMAIL` | installer | |
| `BLINKBOX_HOSTNAME` | installer | Caddy site — `<name>.blinkbox.net` |
| `BACKEND_PUBLIC_URL` | installer | `https://<hostname>` |
| `CORS_ORIGINS` | installer | `https://<hostname>` |
| `CLOUD_API_URL` | installer | `https://api.blinkbox.net` |
| `COMPOSE_PROFILES` | installer | `local` in local mode, empty in managed |
| `BLINKBOX_TAG` | optional | image tag, defaults `latest` |

`SELF_HOSTED=true` is set by compose, not by `.env` — it is a property of the
deployment, not a customer choice. `MONGODB_URI` / `REDIS_URL` are supplied by
compose in `local` mode and are **absent** in `managed` mode; that absence is
what triggers the bootstrap.

### 4.3 Cloud API — `/api/self-host`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/register` | license | claim a name, create the A record, return hostname |
| `POST` | `/bootstrap` | license | **new** — managed mode: mint tenant-scoped DB creds, TTL 12h |
| `POST` | `/heartbeat` | license | liveness + version, every 5 min |
| `GET`  | `/status` | license | `{ valid, plan, graceHours }` |
| `GET`  | `/cost/:nodeType` | license | |
| `POST` | `/credits/check` | license | |
| `POST` | `/credits/deduct` | license | |
| `POST` `GET` | `/licenses` | token | dashboard: mint / list |
| `DELETE` | `/licenses/:id` | token | dashboard: revoke → tears down DNS + creds |
| `GET` | `/instances` | token | dashboard: list, with a real `lastSeenAt` |

`/bootstrap` response:

```json
{ "mongoUri": "mongodb+srv://.../bb_<instanceId>",
  "redisUrl": "redis://<aclUser>:<pass>@...",
  "redisPrefix": "bb:<instanceId>:",
  "expiresAt": "2026-08-18T02:00:00.000Z" }
```

The instance refreshes at 80% of TTL. A failed refresh follows the same grace
rule as metering (§2.5): keep running on the open connection, stop at expiry.

### 4.4 Install flow — four questions, hard ceiling

```
curl -fsSL https://raw.githubusercontent.com/blinkboxhq/Blinkbox/main/docker/install.sh | sudo sh

  1  license key     → GET  /status    (distinguishes a bad key from a down cloud)
  2  instance name   → POST /register  (collision → -v bump; DNS created)
  3  owner email
  4  where should your data live?   [1] on this machine (default)  [2] Blinkbox-managed

  → write /opt/blinkbox   → pull images   → up -d
  → wait /health          → seed owner    → print password once
```

Non-interactive equivalents: `BLINKBOX_LICENSE_KEY`, `BLINKBOX_NAME`,
`BLINKBOX_OWNER_EMAIL`, `BLINKBOX_STORAGE`.

### 4.5 Image delivery

`.github/workflows/release.yml` builds both images on `main` and on `v*` tags,
and pushes to `ghcr.io/blinkboxhq/blinkbox-{backend,frontend}` tagged `latest`
(default branch only), `sha-<short>`, and the semver tag. Both packages must be
**public** or every install fails at pull — the installer runs on a customer box
with no credentials for our registry. The frontend build passes
`VITE_SELF_HOSTED=true` and **no** `VITE_API_URL`.

`latest` is what every new install pulls, so the publish job is gated on the
registry drift check, lint, and the backend test suite. Nothing reaches
customers untested.

**linux/amd64 only.** `install.sh` refuses to run on another architecture rather
than letting the pull fail with "no matching manifest". arm64 is deliberate
future work: cheap arm VPSs are common, but a QEMU-emulated build of the backend
image is slow enough to want a native runner first.

A failed pull is a fatal, named error — never swallowed.

---

## 5. Managed-mode isolation — how §2.2 is enforced

**Mongo.** Each instance gets database `bb_<instanceId>` and an Atlas user with
`readWrite` on that database only, created through the Atlas Admin API at
`/bootstrap`. No shared cluster credential ever leaves the cloud.

**Redis.** Each instance gets an ACL user:

```
ACL SETUSER t_<instanceId> on >:<pass> ~bb:<instanceId>:* &bb:<instanceId>:* +@all -@dangerous -@admin
```

This requires every Redis key the backend touches to carry the prefix. Two call
sites need plumbing and neither is automatic:

- **ioredis** — construct with `{ keyPrefix }`. Note that `KEYS`/`SCAN` results
  come back **with the prefix attached**, so `resetOwner.js`'s
  `redis.keys("auth:lockout:owner:*")` must be made prefix-aware or it silently
  matches nothing.
- **BullMQ** — takes its own `prefix` option; it is not covered by `keyPrefix`.

**Blast radius if a customer VPS is compromised:** that one tenant's data. That
is the entire point of this section.

---

## 6. The audit's findings, and where each is resolved

| # | Defect | Resolution |
|---|--------|-----------|
| D1 | Nothing publishes the GHCR images compose pulls; the installer ships no source, so the `build:` fallback cannot save it. **Two of the three systems cannot boot.** | §4.5 — `release.yml`; installer pulls only, fails loudly |
| D2 | `node src/modules/selfhost/seedOwner.js` is wrong in 5 places — container WORKDIR is `/app`, backend lives at `/app/apps/backend/`. Owner seeding always fails. | Correct to `apps/backend/src/...` in `install.sh` ×3, `seedOwner.js:49`, `auth.controller.js:92,389` |
| D3 | `apps/frontend/Dockerfile:11` `ARG VITE_API_URL=http://localhost:3000` bakes a truthy value in, so `selfHost.js`'s `window.location.origin` branch is dead code. Browsers on the real domain call localhost. | §2.4 — drop the ARG default entirely |
| D4 | `/heartbeat` has a route and a controller and **no client**; `lastSeenAt` is frozen at registration. | §4.3 — 5-minute timer in the backend, gated on `SELF_HOSTED` |
| D5 | `docker/env.example` omits `SELF_HOSTED` and `OWNER_EMAIL`; compose's `${OWNER_EMAIL:?}` aborts. The documented by-hand path cannot start. | §7 — rewritten as the dev/source template only, complete |
| D6 | Backend `:3000` and frontend `:8080` are published to the host alongside Caddy, so on a public box the API is reachable without TLS, without the security headers, and without the XFF overwrite that lockouts depend on. | §2.3 — `expose` replaces `ports` |
| D7 | `BLINKBOX_LOCAL` stands the whole stack up and then prints "workflows will not execute". | §7 — deleted. Its real intent, running without the cloud, is served properly by grace-window metering |
| D8 | `docker compose pull --quiet 2>/dev/null \|\| true` masks D1 into an opaque `up -d` failure. | Fatal, named error |

---

## 7. Deletions and demotions

- **Delete** every `BLINKBOX_LOCAL` / `LOCAL_MODE` branch from
  `docker/install.sh`. It is not a mode; it is a second system wearing the
  installer's clothes.
- **Demote** `docker/env.example` from "a way to install Blinkbox" to "the env
  template for running from a source checkout". It becomes a developer file —
  it stops being a third install path and starts being correct.
- **Do not touch** `apps/backend/Dockerfile.desktop` (§3).

---

## 8. Build order

Each phase leaves the tree working. Ship them in order.

| Phase | Scope | Why here |
|-------|-------|----------|
| **1** | D2, D3, D6, D8 + delete `BLINKBOX_LOCAL` + fix `env.example` | surgical; makes the one remaining path coherent |
| **2** | `release.yml` → GHCR (D1) | the installer can finally run end to end |
| **3** | Grace-window metering: cache the last good check, `GRACE_HOURS`, `/status` carries it | §2.5 |
| **4** | Heartbeat client (D4) + real `lastSeenAt` in the dashboard | §4.3 |
| **5** | Storage question in the installer; `local` compose profile | the fork becomes a supported choice |
| **6** | `/bootstrap` + Atlas/Redis provisioning + prefix plumbing (§5) | managed mode |

Phase 1 is the only phase that changes existing behaviour without adding
surface. Phases 5–6 are the new product; 2–4 are debt that has to clear first
or the new product gets built on sand.
