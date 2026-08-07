# Blinkbox MCP tools — full reference

Every tool runs as the user, through the same REST API, validators and
workspace-isolation guards the browser uses. Nothing here can do something the
user couldn't do themselves.

---

## Discovery

### `list_nodes`
`{ search?, picker?, category?, include_unavailable? }`

Browses the catalog. Only picker-visible nodes are listed, so anything returned is
safe to build with.

- `picker`: `"trigger"` (starts a workflow) · `"action"` (a step) · `"agent"`
  (models / memory / tools that plug into an AI Agent)
- `category`: `trigger`, `apps`, `logic`, `infra`, `ai_models`, `ai_agent`, `data`,
  `databases`
- `include_unavailable`: default `false`. Leave it false — `true` surfaces nodes with
  no backend handler that you must not build with.

Output caps at **120 rows**. Always pass `search` unless you genuinely need a survey.
Each row: `• key — Label [pickers, category, has actions, <provider> oauth]`.

### `get_node`
`{ node, event? }`

The node's config panel expressed as data. Returns:

- **Config fields** split into Required / Optional, each with key, type, description,
  allowed values, example
- **Outputs** — the field names later steps reference as `{{ $json.<field> }}`
- **Handles** — how many outputs and what their `sourceHandle` ids are
- **Credential status** — what it needs, whether the user already has one, its id,
  and which config key to put the id in
- **Actions** — for app nodes: how many operations, the default one, and the default's
  required params

For a trigger, pass `event` to get that event's **exact config skeleton**. Call it
once without `event` to see the event ids, then once with the chosen id.

`Config fields: not documented yet` means the schema was never captured. Do not
invent field names — inspect an existing automation that already uses the node
(`get_automation`), or have the user configure it in the builder.

### `list_node_actions`
`{ node, search? }`

Operations an app node can perform (`slack` → `send_message`, `list_channels`, …),
with description, OAuth scopes, params, and which is the default. A `*` marks a param
the operation refuses to run without.

Also lists **resource pickers** — live-resolving selectors (channels, sheets, bases)
that populate once a credential is set.

Only call this when `get_node` didn't already give you what you need. Caps at 150 rows.

**Triggers have no operations.** Asking for them returns a redirect to the app's
action node. Never put an `operation` in a trigger's config.

---

## Automations

### `list_automations` — `{}`
Name, on/off status, trigger, step count, id.

### `get_automation` — `{ automation }`
Name, status, trigger, description, ordered steps, id.

### `create_automation`
`{ prompt, name?, activate?, brief_answers? }`

Runs Blinkbox's AI builder (Brian) on a plain-English description, then saves the
result. Returns the new id and a builder URL.

**The build-brief loop.** If the description is under-specified, the tool returns
numbered questions instead of a workflow. Answer them with the user, then call again
with:
- the **same `prompt`** verbatim, and
- `brief_answers` — their answers, one per line.

Each tool call is a fresh HTTP request, so the same prompt plus `brief_answers` is
what tells the builder the brief is already answered. A reworded prompt makes it
start over.

`activate: true` turns it on immediately — only pass it when the user has said they
want it live. If activation then fails validation, the automation still exists; open
it and fix what the error names.

### `run_automation` — `{ automation, input? }`
Runs now, active or not. `input` is arbitrary JSON delivered to the workflow. Returns
an execution id — the run is **asynchronous**, so poll `get_execution`.

### `activate_automation` / `deactivate_automation` — `{ automation }`
Activate validates first and returns why if the workflow is incomplete.

### `rename_automation` — `{ automation, name }`

### `delete_automation` — `{ automation }`
**Irreversible.** Confirm in words before calling.

---

## Executions

### `list_executions` — `{ automation }` — last 20 runs.
### `get_execution` — `{ execution_id }` — status, error, timestamps.
### `get_execution_logs` — `{ execution_id }` — per-step `[status] step — message`.

Runs are asynchronous. After `run_automation`, `get_execution` may show `queued` or
`running`; check again rather than declaring failure.

---

## Credentials

### `list_credentials` — `{ node? }`
Names, types, ids. **Secrets are never returned.** With `node`, narrows to credentials
that node accepts and names the config key to put the id in.

### `create_credential` — `{ name, secret?, node?, type? }`
API-key style credentials only. Leave `type` empty — it defaults to the type the
node's own panel looks for, which is what makes the credential appear there. Pass
`node` so the type is derived correctly.

Passing an OAuth app returns the Credentials-page instruction instead of saving —
that is correct behaviour, not an error.

---

## Raw API

### `blinkbox_api_get` — `{ path }`
Any GET the user owns. **Read-only, no approval prompt** — use it for every read the
named tools don't cover: `/analytics/overview`, `/profile`, `/automation/<id>`,
`/credentials`, `/automation/<id>/versions`.

### `blinkbox_api` — `{ method, path, body?, confirm? }`
Full REST control: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`.

Use for what the named tools don't do — updating a workflow's graph, duplicating,
versions, collaborators, resuming/retrying/cancelling runs, feedback.

**Rules baked into the tool:**
- Paths are **relative and same-origin**. A full URL, `//host`, or `..` is rejected.
  A leading `/api/` is stripped for you.
- Blocked areas: `auth`, `admin`, `oauth`, `billing`, `keys`, and anything starting
  with `mcp`. Not negotiable — route the user to the app instead.
- **`confirm: true` is required** for `DELETE` and for any non-GET whose path matches
  `delete|remove|cancel|reset|restore|kill`, `/collaborators/`, or `/reject`. Set it
  only on a clear user instruction to destroy something.
- Responses truncate at 12 000 characters.

**Useful routes**

| Route | Method | Purpose |
|-------|--------|---------|
| `/automation` | GET | List (supports `?limit=`) |
| `/automation/<id>` | GET / PUT | Read / replace the full workflow |
| `/automation` | POST | Create from an explicit graph |
| `/automation/<id>/duplicate` | POST | Copy |
| `/automation/<id>/versions` | GET | Version history |
| `/automation/test-node` | POST | Run one node in isolation (rate-limited: 30/min) |
| `/automation/models/<provider>` | GET | Live model list — needs `?credentialId=` (20/min) |
| `/execution/start/<id>` | POST | Start a run |
| `/execution/<id>` , `/execution/<id>/logs` | GET | Run status / logs |
| `/execution/automation/<id>` | GET | Runs for one automation |
| `/credentials` | GET / POST | List / create |
| `/analytics/overview` | GET | Usage stats |
| `/profile` | GET | Account info |
