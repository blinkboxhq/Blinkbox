# Engineering Notes

Practical notes for working on the BlinkBox monorepo. Nothing here changes
runtime behavior — it documents how to run, check, and not break the repo.

## Runtime

Node **22+** is required (`.nvmrc` / `.node-version` / `engines.node` all say so).
The backend runs through `tsx`, the frontend through Vite. CI tests on Node 22.

```bash
nvm use          # picks up .nvmrc
```

## Common commands (from repo root)

| Command | What it does | Needs |
|---|---|---|
| `npm run dev:frontend` | Vite dev server on port 5174 | deps installed |
| `npm run dev:backend` | Express backend on port 3000 | deps, **MongoDB Atlas + Redis reachable**, `apps/backend/.env` |
| `npm run build:frontend` | Production frontend build | deps installed |
| `npm run test:backend` | Backend test suite (`node --test` via tsx) | deps; uses mongodb-memory-server + ioredis-mock, no live services |
| `npm run typecheck:backend` | `tsc --noEmit` over the backend | deps installed |
| `npm run registry:check` | Frontend/backend node registry drift report | nothing (reads source files) |
| `npm run check` | registry:check + typecheck:backend | deps installed |

The backend will fail fast at startup if required env vars are missing —
that's intentional (`src/config/env.js` validates on load). If `dev:backend`
exits immediately, check `apps/backend/.env` before suspecting the code.

## Registry drift — why it matters

A node type lives in two places that must agree:

- **Frontend**: `apps/frontend/src/pages/Workspace/nodeRegistry.js` — what the
  canvas can render and configure.
- **Backend**: `apps/backend/src/nodes/index.js` — what the execution engine
  can actually run (`nodeRegistry[node.type]`).

A frontend key with no backend counterpart renders fine on the canvas and then
**fails at execution time** — the worst kind of drift because nothing catches
it until a user runs the workflow. Backend-only keys are usually harmless
(compat aliases, agent tools, trigger registrations).

### Running the checker

```bash
npm run registry:check            # report only, always exits 0
npm run registry:check -- --strict
```

`--strict` exits non-zero only when it finds frontend keys that have **no**
backend match, no known alias, and no name-normalized match — i.e. nodes that
would genuinely fail at execution. It stays a visibility tool by default so it
never blocks local work; wire `--strict` into CI once the report is
consistently clean.

The checker is regex-based on purpose (the frontend registry is ~2700 lines of
JSX-adjacent code we don't want to evaluate, and importing the backend index
runs side effects). Treat it as a report, not a proof. Known quirks it already
understands:

- `agent_integration_*` and `agent_skill` are consumed through agent edge
  handles in `cursor.executor.js`, never via registry lookup — not drift.
- Known aliases (`webhook_response` → `respond_webhook`, `graphql` →
  `graphql_request`, `rss_feed`/`rss_feed_generator` → `rss`) are reported as
  "possible alias", never auto-fixed.

## Safe future improvements (suggestions, not commitments)

- **Node status classification** — a `status: "stable" | "beta" | "experimental"`
  field per registry entry so the UI can badge or hide unfinished nodes. Do it
  incrementally, not as a 250-node sweep.
- **Canonical node manifest** — one generated JSON manifest (key, label,
  category, backend handler present y/n) that both registries are validated
  against, replacing regex drift-checking with a real contract.
- **Workflow contract tests** — a handful of golden workflows (trigger →
  condition → action) executed against the engine in CI using the existing
  mongodb-memory-server/ioredis-mock setup, so executor regressions surface
  before deploy.
- **Dependency upgrade pass** — deliberate, one-workspace-at-a-time; several
  heavy deps (puppeteer, temporal, isolated-vm) pin native builds. Don't mix
  upgrades with feature work.
- **Public webhook hardening** — rate limits exist (Redis-backed); a future
  pass could add per-workspace quotas and payload size caps at the router
  level.

## House rules that bite

- Never `git add .` — stage specific files.
- The frontend registry and `triggerVariants.js` must stay in sync for trigger
  apps.
- `panOnDrag={false}` / `panOnScroll={true}` / `selectionOnDrag={true}` on the
  canvas are load-bearing. Leave them.
