---
name: blinkbox-mcp
description: Correct, safe usage patterns for the blankbox MCP server against a live Blinkbox workspace — read-before-write order, engine-aware debugging, credential/OAuth limits, and destructive-action guardrails so automations don't break.
---

# blinkbox-mcp

Apply this whenever calling any `mcp__claude_ai_blankbox__*` tool against the user's live Blinkbox workspace.

## Golden rule
MCP tools run as the user, live, on real automations. Every write-shaped call (activate, run, rename, delete, `blinkbox_api` POST/PATCH/PUT/DELETE) has a real consequence — treat it with the same care as a production database, not a sandbox.

## Read-before-write order
1. `list_automations` — see what exists and current on/off state before touching anything.
2. `get_automation` — read its trigger + steps before activating, running, or renaming it. Never act on an automation you haven't inspected this session.
3. Only then: `run_automation` / `activate_automation` / `deactivate_automation` / `rename_automation`.

## Building blocks — discover, never guess
- Use `list_nodes` to get real node keys (filter by `picker`/`category`/`search`). Never invent a node key.
- Use `get_node` before filling any config — field names, required-ness, output fields (`{{ $json.x }}`), and whether a credential is already attached. Guessing a field name silently no-ops instead of erroring.
- Use `list_node_actions` before setting an app node's `operation` value — it also tells you the OAuth scope that operation needs.
- Nodes returned with `include_unavailable` exist in the catalog but have no backend handler — never wire one into a real automation.

## Credentials & OAuth
- `create_credential` only works for API-key/token style creds.
- OAuth apps (Google/Gmail/Sheets/Drive/Calendar, Slack, Microsoft/Outlook/Teams, GitHub, Airtable, Notion, Meta/WhatsApp) **cannot** be connected from chat — `create_credential` hands back a Connect link instead. Never ask the user to paste an OAuth token; give them the link.
- Check `list_credentials(node)` before telling a user a node is unconfigured — it reports exactly what's missing.

## Engine model — know it before you interpret a run
Matches the real cursor engine in `cursor.executor.js` (see `.claude/context/architecture.md`):
- Executions are cursor-based (BullMQ): a trigger creates an `Execution` doc with `cursors[]`; the executor claims each cursor, runs the node handler, writes to the `ExecutionData` vault, then fans out along matching edges.
- A node returning `{__conditionResult:false}` is a **successful** run routed to failure/false edges — not an error. Don't report it as a broken automation.
- `{__loopFanOut:true, items}` spawns one cursor per item — many cursors for one run is expected, not a bug.
- `{__delay:true, resumeAfter}` parks a cursor as "waiting" — that isn't stuck, it's scheduled. Only "running" >90s or "waiting" >5min is actually stuck (the thresholds `execution.resumer.js` itself uses for crash recovery).
- Debug failures with `list_executions` → `get_execution` → `get_execution_logs`, in that order, before re-running blind.

## Activation safety
- `activate_automation` validates the workflow first and reports why if incomplete — relay that exact reason to the user rather than retrying activation blind.
- Don't toggle activate/deactivate just to "test" a workflow — use `run_automation`, which runs on demand regardless of active state.

## Destructive actions
- `delete_automation` is irreversible — always confirm with the user first.
- `blinkbox_api` DELETE, or any POST/PATCH/PUT that removes/cancels/overwrites, needs `confirm:true` — set it only when the user explicitly asked to delete/replace/cancel something, never preemptively.
- `blinkbox_api` / `blinkbox_api_get` are off-limits for auth, admin, billing, oauth, and API-key/connector management routes — if a task seems to need one of those, stop and tell the user instead of probing for a workaround route.
- Prefer `blinkbox_api_get` (no approval needed) for reads; escalate to `blinkbox_api` only for writes the named tools don't already cover.

## What chat/MCP cannot do
- New automations are built in the visual builder, not from chat — don't try to construct a workflow graph via `blinkbox_api` POST as a substitute; point the user to the builder.
- Registry/engine source changes (`nodeRegistry.js`, `cursor.executor.js`, node handlers) are ordinary repo edits governed by `.claude/rules/backend-nodes.md` and `node-registry.md` — a separate concern from MCP tool usage, not something these tools touch.

## Reporting back to the user
- Describe condition-false / delay / loop-fanout results in plain language ("routed to the false branch", "scheduled to resume at X", "ran once per item") — don't surface raw signal names like `__conditionResult` unless the user is debugging at that level.
- When `activate_automation` fails validation or a node lacks a credential, give the exact reason returned, not a generic "something's wrong."
