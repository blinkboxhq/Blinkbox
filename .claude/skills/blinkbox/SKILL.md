---
name: blinkbox
description: Build, run, debug and manage Blinkbox automations (workflows) through the Blinkbox MCP connector. Use whenever the user asks to automate something, connect two apps, schedule a recurring job, react to a webhook or app event, or mentions Blinkbox, an "automation", a "workflow", a "zap", or asks to fix/inspect a run that failed. Covers node discovery, config field lookup, credentials (OAuth vs API key), expressions, branching, and the raw REST escape hatch.
---

# Blinkbox

Blinkbox is an automation platform (Zapier / Make / n8n class). A **workflow** is a
directed graph: one **trigger** node starts it, **action** nodes run in sequence,
**logic** nodes branch and loop. You drive it through the `blinkbox` MCP connector,
which runs every call **as the user**, scoped to their own workspace.

**Everything you build must be editable by a human in the visual builder.** That is the
constraint behind every rule below.

---

## The five laws

1. **Never invent a node key.** `list_nodes` is the only source of truth. A key that
   isn't in the picker cannot be built with — the tools will reject it and tell you
   the near-misses.
2. **Never guess a config field.** `get_node` returns the node's real panel as data:
   field keys, types, required flags, examples, outputs, handles, credential slot.
   Read it before you fill anything in.
3. **Credentials before wiring.** A workflow with no credential is a workflow that
   fails on first run. Check `list_credentials` early; OAuth apps must be connected
   by the user in a browser — you cannot do it from chat.
4. **Prefer `create_automation`.** It runs Blinkbox's own AI builder, which already
   knows the catalog and produces a canvas-correct graph. Hand-assembling nodes via
   `blinkbox_api` is the fallback, not the default.
5. **Verify by running.** `run_automation` → `get_execution_logs`. A workflow you
   never ran is a guess. Activate only after a clean run.

---

## The golden path

```
1. list_credentials                 ← what can this user actually reach?
2. list_nodes  (search / picker)    ← real keys for trigger + actions
3. get_node    (each key)           ← fields, outputs, credential slot
4. create_automation (prompt)       ← let the builder assemble it
   └ returns a build brief? → answer with the user, re-call with the SAME
     prompt + brief_answers
5. run_automation → get_execution_logs   ← prove it works
6. activate_automation              ← only once it runs clean
```

Steps 2–3 are what separate a workflow that opens correctly in the builder from
one that silently no-ops. Do not skip them because the request "sounds simple".

---

## Tool map

| Goal | Tool |
|------|------|
| See what exists | `list_automations`, `get_automation` |
| Find building blocks | `list_nodes`, `get_node`, `list_node_actions` |
| Credentials | `list_credentials`, `create_credential` |
| Build | `create_automation` |
| Run & debug | `run_automation`, `list_executions`, `get_execution`, `get_execution_logs` |
| Lifecycle | `activate_automation`, `deactivate_automation`, `rename_automation`, `delete_automation` |
| Anything else | `blinkbox_api_get` (reads), `blinkbox_api` (writes) |

`automation` arguments accept a **name or an id** — exact name first, then substring,
over the user's 50 most recent. Prefer ids when you already have one.

Full signatures and per-tool gotchas → `reference/tools.md`.

---

## Efficiency (this matters — every call is the user's money)

- **Search, don't browse.** `list_nodes` with `search: "slack"` beats an unfiltered
  list; unfiltered output caps at 120 rows and burns context for nothing.
- **`get_node` once per node**, then keep the schema in working memory. Do not
  re-fetch the same node twice in one build.
- **`get_node` already names the credential.** It reports whether the user has a
  matching one and its id — a separate `list_credentials` for that node is wasted.
- **`get_node` on an app node already names the default operation and its required
  params.** Only call `list_node_actions` when you need a *non-default* operation.
- **`blinkbox_api_get` is free of approval prompts; `blinkbox_api` is not.** Never
  use the write tool for a read.
- **Responses truncate at 12 000 characters.** Ask for narrow paths, not `/automation`
  with 50 workflows inlined.
- **Batch independent reads** in one turn.

Cheapest correct path wins. A one-line automation request should cost ~4 tool calls,
not 15.

---

## Building workflows

`create_automation` takes plain English and returns a saved, canvas-correct workflow.
Give it the *whole* intent in one prompt — trigger, steps, and destination:

> "When a Stripe payment succeeds, post the amount and customer email to the
> #sales Slack channel, and add a row to the Revenue Google Sheet."

If it can't build yet it returns a **build brief** — a numbered list of questions.
Answer them *with the user*, then call again with the **same `prompt`** plus
`brief_answers` (one answer per line). Passing a different prompt makes the builder
start over and re-ask.

For hand-assembly, editing existing graphs, expressions (`{{ $json.x }}`), branching
handles, loops, delays and AI-agent slots → `reference/building.md`.

---

## Credentials

Two kinds, and the difference decides whether you can help at all:

- **API key / token** — `create_credential` with `name`, `secret`, and `node`.
  Saved encrypted, never read back. You get an id; put it in the node's credential
  slot (usually `config.credentialId`).
- **OAuth** — `google`, `slack`, `microsoft`, `github`, `airtable`, `notion`, `meta`.
  These need a browser consent screen. **You cannot create them from chat.** Send the
  user to the Credentials page to click Connect, then re-check. **Never ask a user to
  paste an OAuth token** — if they offer one, decline and point them at the page.

Full playbook, slot resolution, and matching rules → `reference/credentials.md`.

---

## Catalog shape

201 picker-visible nodes: 64 triggers, 42 apps, 33 infra, 24 AI models, 11 logic,
11 AI-agent parts, 10 data, 6 databases.

A handful appear in the builder but have **no backend handler** — `list_nodes` marks
them `⚠ not runnable yet` and `get_node` says `NOT RUNNABLE`. Never put one in a
workflow; pick a different node.

Category guide and the notable keys → `reference/catalog.md`.

---

## When a run fails

`get_execution_logs <id>` first — it names the failing step. Then match the message
against `reference/troubleshooting.md`, which maps the common failures (expression
didn't resolve, missing credential, cron rejected on activate, trigger with an
`operation`, wrong handle) to their fixes.

---

## Safety rails (built into the connector — respect them, don't route around them)

- `auth`, `admin`, `oauth`, `billing`, `keys` and any `mcp*` route are **blocked**
  for the connector. If a task needs one, tell the user to do it in the app.
- `blinkbox_api` requires `confirm: true` for `DELETE` and for any write whose path
  removes/cancels/overwrites. Set it **only when the user clearly asked** for that
  destruction — never to clear an error.
- `delete_automation` is irreversible. Confirm in words first.
- Paths are relative and same-origin only. A full URL is rejected by design.
- Activating a workflow makes it run **for real** against the user's live accounts.
  Say what will happen before you flip it on.
