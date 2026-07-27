# Chaos Cascade

A runnable reliability stress suite for the Blinkbox engine. It does not measure how fast
Blinkbox is — it tries to break it in the four ways a workflow engine actually breaks in
production, and grades what happens:

| # | Module | Question it answers |
|---|--------|---------------------|
| 1 | **Dynamic Payload Escalation** | Does ingest reject oversized bodies cleanly, or degrade? Does memory come back? |
| 2 | **Recursive & Circular Loop Trigger** | Do the recursion/rate guards intercept an A→B→A loop at 1000+ ops/sec *without wedging the event loop*? |
| 3 | **Chaos Webhook Receiver** | When a downstream peer is 70% broken, does the engine retry with backoff, or hang / lose work? |
| 4 | **State Mutex & Race Hammer** | With 120 workers mutating one record and one idempotency key, are updates lost or duplicated? |

Every module ends in `PASS` / `FAIL` / `WARN` / `SKIPPED` checks with evidence, aggregated into
a terminal table plus a JSON + Markdown report. Exit code is `0` unless something FAILed, so it
gates CI as-is.

---

## Requirements

- Node ≥ 20 (developed on v22)
- A running Blinkbox backend (`npm run dev:backend` from the repo root)
- A **throwaway** account/workspace — the suite creates, drives and deletes real automations
- `ALLOW_LOCAL_REQUESTS=true` in `apps/backend/.env` for modules 2 and 3 only

That last one matters. The `httpRequest` node's SSRF guard blocks loopback URLs, and modules 2
and 3 need the engine to call back into localhost (its own webhook, and the bundled mock peer).
Without the flag the suite does not report a false failure — those checks come back `SKIPPED`
with the remediation printed. Modules 1 and 4 work either way.

## Install

Nothing to install if the monorepo's root `node_modules` exists — the suite has **zero runtime
dependencies** (`node:http` only) and borrows `tsx` from the root:

```bash
cd tests/stress
../../node_modules/.bin/tsx chaos-cascade.ts --help
```

To run it standalone (outside the monorepo):

```bash
cd tests/stress && npm install && npm run chaos -- --help
```

## Run

```bash
# everything, against a local backend
npm run chaos -- --email=you@example.com --password=hunter2

# a fast pass (~2 min) for a pre-commit sanity check
npm run chaos:quick -- --token="$CHAOS_TOKEN"

# one module, turned up
npm run chaos -- --modules=mutex --mutex-workers=250 --mutex-rounds=5

# plan only: connectivity, auth, write permission — no load
npm run chaos -- --dry-run
```

Credentials can also come from the environment: `CHAOS_TOKEN`, or `CHAOS_EMAIL` +
`CHAOS_PASSWORD`. Nothing is ever read from `apps/backend/.env`.

**Safety:** the suite refuses any non-loopback target unless you pass `--allow-remote`. It drives
1000+ rps, 50 MB bodies and deliberate infinite loops. Never point it at production.

## Configuration

Every flag has an env equivalent; CLI wins. `--help` prints the full list.

| Flag | Default | What it does |
|---|---|---|
| `--target=URL` | `http://127.0.0.1:3000` | Backend base URL |
| `--target-pid=N` | auto-detected via `lsof` | Enables target RSS/CPU sampling; without it memory checks WARN |
| `--modules=a,b` | all | `payload`, `recursion`, `flaky`, `mutex` |
| `--concurrency=N` | 32 | Default virtual users |
| `--max-sockets=N` | `concurrency × 2` | Socket pool ceiling |
| `--timeout=MS` | 35000 | Per-request timeout (deliberately above the 29 s chaos hold) |
| `--seed=N` | 1337 | Deterministic fault sequence — same seed replays the same faults |
| `--header="K: V; K2: V2"` | — | Extra headers on authenticated requests |
| `--payload-ladder=1kb,5mb,…` | `1kb,64kb,512kb,1mb,2mb,5mb,25mb,50mb` | Payload rungs |
| `--recursion-rps=N` | 1200 | Open-loop offered rate for the storm |
| `--recursion-duration=SEC` | 20 | Storm length |
| `--chaos-port=N` | 4599 | Port for the bundled flaky server |
| `--chaos-delay=MS` | 29000 | Slow-mode hold |
| `--chaos-w-delay/-error/-drop/-ok` | 30/30/10/30 | Fault mix weights |
| `--flaky-requests=N` | 60 | Executions driven through the flaky peer |
| `--mutex-workers=N` | 120 | Concurrent mutators in the race hammer |
| `--report-dir=PATH` | `./reports` | JSON + Markdown output (gitignored) |
| `--keep-artifacts` | off | Do not delete the automations the suite creates |
| `--no-live` / `--quiet` | auto | Dashboard off (auto-off when not a TTY) / summary only |

## Layout

```
tests/stress/
├── chaos-cascade.ts            # entrypoint: config → preflight → modules → report
├── package.json                # standalone; zero runtime deps
├── tsconfig.json
└── src/
    ├── config.ts               # every knob, CLI + env
    ├── types.ts                # RequestResult, Check, ModuleReport, RunReport
    ├── http-client.ts          # node:http wrapper + error classification
    ├── metrics.ts              # bucketed-histogram Recorder + registry
    ├── resources.ts            # harness heap/CPU/loop-lag + out-of-band target RSS
    ├── runner.ts               # runPool, barrierFanOut, openLoop
    ├── dashboard.ts            # live TTY stats (degrades to a log digest)
    ├── reporter.ts             # terminal table + JSON/Markdown artifacts
    ├── blinkbox-api.ts         # typed control-plane client + the workflow graphs used
    ├── context.ts              # ModuleCtx + verdict aggregation
    └── modules/
        ├── payload-escalation.ts
        ├── recursion-storm.ts
        ├── flaky-webhook.ts
        ├── chaos-server.ts     # the mock flaky peer (also runnable on its own)
        └── mutex-hammer.ts
```

## The modules in detail

### 1 — Dynamic Payload Escalation

Walks 1 KB → 64 KB → 512 KB → 1 MB → 2 MB → 5 MB → 25 MB → 50 MB against the public webhook
ingest, taking a target-RSS reading before each rung, after each rung, and again after a settle
window.

Blinkbox mounts `express.json({ limit: "2mb" })`, so rungs past 2 MB *should* 413. A clean 413 is
a PASS — the finding to hunt is the other shape: a 5xx, a timeout, or a socket hang, which means
the oversized body was buffered before it was refused. The leak check compares post-settle RSS
against the baseline with a budget of 25% of the largest accepted payload (floor 24 MB); an
additional WARN fires if RSS never comes back down between rungs, which is the signature of a
slow leak rather than allocator fragmentation.

Payload buffers are built once per rung and reused, and big rungs are throttled so the harness
can never be the process that OOMs.

### 2 — Recursive & Circular Loop Trigger

Blinkbox rejects cyclic DAGs statically (`validateAutomation`), so a real recursion test has to
build the cycle *across* automations: A's `http_request` calls B's webhook, B's calls A's. Both
are created with placeholder URLs and repointed via `PUT /api/automation/:id` once both ids
exist. A third, self-calling automation is created as the tightest possible loop.

The storm is **open-loop** — requests are emitted on a schedule regardless of whether earlier
ones have returned. A closed-loop generator would silently slow down as the target slows down
(coordinated omission) and would report a healthy system right up until it fell over.

Checks: was 1000+ rps actually offered; did the rate limiter fire (429); was load shed or
swallowed; **did `/health` stay responsive throughout** (on a separate socket pool, so a wedged
event loop shows up even when the storm's own sockets are queued — this is the "without locking
threads" requirement); did execution activity decay after the storm stopped, or is the loop still
self-feeding; did any execution exceed the 500-cursor cap.

### 3 — Chaos Webhook Receiver (flaky peer)

A self-contained `node:http` server with a seeded PRNG applying, by weight:

- **30% delay** — holds the socket 29 s before responding (default timeouts are usually 30 s: this
  is the window where a hung socket is indistinguishable from a slow peer)
- **30% error** — 429 / 502 / 503 / 504, with `retry-after: 2` on 429 and 503
- **10% drop** — writes `HTTP/1.1 200 OK` + `content-length: 512`, then destroys the socket
  mid-body: a truncated response, not a refused connection
- **30% ok** — 200

The server records every attempt with its correlation id, so retries are visible as repeat
attempts on the same id and backoff is visible as the gaps between them. The suite first
self-tests the receiver directly (proving the faults really fire), then points a Blinkbox
automation at it and observes for 90 s — longer than the 29 s hold, so slow-peer executions have
time to reach a terminal state. The gap series is graded as growing (backoff), flat (fixed-delay
retry), or absent (no retry at all).

Run it standalone to point other tools at it:

```bash
npm run chaos:server          # then POST http://127.0.0.1:4599/hook?corr=abc
curl http://127.0.0.1:4599/__chaos/stats
curl "http://127.0.0.1:4599/hook?mode=drop"   # force a specific fault
```

### 4 — State Mutex & Race Condition Hammer

120 workers per round, all released from a **barrier** in a single tick — they are prepared, held,
then let go together, because a plain `Promise.all` over 120 requests arrives as a staircase and
staircases do not expose races.

Three targets:

1. **Lost updates** — every worker GETs one automation, appends its own token to `description`,
   and PUTs it back. Missing tokens at the end are lost updates. `PUT /api/automation/:id`
   replaces the whole document with no version/If-Match, so this is expected to fail; the report
   names the fix.
2. **`POST /api/automation/:id/execute`** with one shared `x-idempotency-key`. This path inserts
   against a unique index and catches duplicate-key (11000) — the correct shape.
3. **`POST /api/execution/start/:automationId`** with one shared `Idempotency-Key`. This path is
   `findOne` *then* create — a TOCTOU window that only a unique index closes.

Both idempotency paths are hammered because the codebase implements the same guarantee twice, in
two different ways. Any round that yields more than one distinct execution `_id` for one key is a
FAIL, and persisted executions are re-read afterwards so duplicate *work* is confirmed
independently of what the API responses claimed.

Workers are async over real sockets rather than `worker_threads`. The race being tested is on the
server, and 120 real concurrent sockets released together reproduce it — while staying immune to
loader/spawn overhead that would smear the release window.

## Output

Live dashboard (TTY): active connections, RPS + peak, success/failure counts, error mix split by
4xx / 413 / 429 / 5xx / timeout / socket-drop, avg/p50/p95/p99 latency, harness heap + event-loop
lag, and target RSS/CPU.

On completion: a verdict table in the terminal and two files in `--report-dir`
(`chaos-cascade-<timestamp>.{json,md}`, plus `latest.{json,md}`). The Markdown leads with a
"What is broken" section carrying each failure's evidence; the JSON keeps every check, metric and
resource sample so a failure can be re-litigated without re-running.

Reports are gitignored.

## Notes on method

- **Open-loop generation** for the storm, closed-loop pools elsewhere. Closed-loop numbers under
  saturation are self-flattering.
- **Bucketed histograms** (~0.9% width) instead of sample arrays: retaining every latency at
  1000 rps for minutes would cost more memory than the leak detector is looking for.
- **Watchdogs run on their own agent** with their own sockets, so health probes never queue behind
  the load they are measuring — and never contaminate the reported latency.
- **Target memory is read out-of-band** (`ps` on the listening PID), because the harness cannot see
  another process's heap. On a remote target those fields are null and the memory checks WARN
  rather than silently pass.
- **Seeded faults.** `--seed=N` replays the identical fault sequence, so a retry regression is
  bisectable.
- **Cleanup.** Created automations are deleted on exit unless `--keep-artifacts` is passed; the
  mock server is stopped in a `finally`.
