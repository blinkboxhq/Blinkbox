# Blinkbox Architecture Map

One-page system map. For hard rules see `.claude/CLAUDE.md` and `.claude/rules/`.

## Monorepo Layout

```
apps/backend/          Express API + execution engine (port 3000)
  src/core/            app.js (middleware), server.js, database.js, browser.manager.js
  src/config/env.js    validated env loading — the ONLY place secrets are read
  src/modules/         feature modules: auth, automation, execution, workers,
                       credentials, billing, brian (AI copilot), collab, mcp, admin…
  src/nodes/           backend node handlers (one file per node) + index.js registry
  src/triggers/        trigger handlers (manual, webhook, cron, pollers)
  src/infra/           redis, bullmq, socket.io, pollers, credit engine, delay scheduler
  src/models/          mongoose models (automation, execution, executionData, user…)
  e2e/                 engine contract + workflow tests (mongodb-memory-server)
apps/frontend/         React + Vite + Tailwind (port 5174)
  src/pages/Workspace/ canvas, nodeRegistry.js, triggerVariants.js, config panels
  src/pages/Dashboard/ workspace home, vault/credentials, integrations
  src/pages/Landing/   3D WebGL landing (Landing.jsx) + LandingClassic.jsx fallback
  src/store/           Zustand slices (graph, UI, history)
  src/assets/          brand logos (see ATTRIBUTIONS.md)
packages/              shared types & utilities
scripts/               repo maintenance (check-node-registry.mjs --strict runs in CI)
docs/                  engineering notes, design explorations
```

## Execution Engine (BullMQ cursor model)

1. Trigger fires → `execution.service.js` validates → `executeAutomation` creates an
   Execution doc with a `cursors[]` array and enqueues the entry cursor.
2. `cursor.executor.js#processCursor` claims a cursor atomically
   (`status ∈ {pending, waiting}` via arrayFilters), runs the node handler,
   writes output to the ExecutionData vault (`{executionId, nodeId}`), then
   spawns downstream cursors along matching edges.
3. Engine signals returned by node handlers:
   - `{ __conditionResult: false }` → route to false/error edges, not a failure
   - `{ __loopFanOut: true, items }` → one cursor per item with `_loopItemOverride`
   - `{ __delay: true, resumeAfter }` → downstream cursor parked "waiting" + scheduled
4. Merge nodes gate on all incoming data-flow edges having vault entries;
   a Redis lock (30s TTL + 10s heartbeat renewal) prevents double-spawn.
5. `execution.resumer.js` (every 5s) is crash recovery only: re-enqueues stale
   "running" (>90s) and stuck "waiting" (>5min) cursors.
6. Temporal is a scaffold behind `TEMPORAL_ADDRESS`, forced OFF in production
   (no credit metering on that path yet).

## Registries (must stay in sync)

- `apps/frontend/src/pages/Workspace/nodeRegistry.js` — frontend key
- `apps/backend/src/nodes/index.js` — backend key (must match frontend key exactly)
- `apps/frontend/src/pages/Workspace/triggerVariants.js` — trigger apps only
- Drift check: `npm run registry:check` (strict mode in CI)

## Data Models (mongoose)

- **Automation** — nodes[] (id/type/data/position), edges[] (source/target/
  sourceHandle/targetHandle/type onSuccess|onFailure), workspaceId, trigger
- **Execution** — cursors[] (nodeId/status/_loopItemOverride), status, events (capped 500)
- **ExecutionData** — output vault keyed {executionId, nodeId}; loop branches
  overwrite the same doc (last-writer-wins — known quirk)
- **Credential** — encrypted at rest, scoped to workspaceId

## Deploy

- Frontend → GitHub Pages via `.github/workflows/deploy-frontend.yml`
  (root package-lock.json, `npm ci --workspace=apps/frontend`, CNAME at repo root)
- Backend → Nixpacks (`apps/backend/nixpacks.toml`)
- CI tests → `.github/workflows/test.yml` (backend suite + registry check)
