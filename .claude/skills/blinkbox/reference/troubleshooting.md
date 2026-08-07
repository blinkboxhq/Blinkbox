# Troubleshooting

Blinkbox errors are classified and carry a hint. `get_execution_logs` shows both.
Read the category first — it tells you whether the platform will fix it or you must.

---

## Auto-retry vs. your bug

Retried with backoff: `rate_limit`, `resource`, `unknown`.

**Never retried** — these don't self-fix, so a re-run just wastes a credit:

```
config · auth · expression · code · parse · quota · network · timeout
```

A log line ending `[<category> error — auto-retry skipped, fix required]` means
**edit the workflow**, don't re-run it.

---

## By category

| Category | What it means | Fix |
|----------|---------------|-----|
| `auth` | Credential expired, wrong, or absent | Re-check with `list_credentials`; OAuth → user reconnects on the Credentials page |
| `config` | External API rejected the request — wrong id, missing field | `get_node` the node, compare fields, fix the config |
| `expression` | A `{{ }}` didn't resolve | The referenced field isn't in upstream output — see below |
| `code` | JS error in a `code` node | Syntax, undefined var, or type mismatch |
| `parse` | Response wasn't valid JSON | The URL is returning HTML (often a login page) |
| `network` | Host unreachable | URL typo, server down, or blocked by the SSRF guard |
| `timeout` | Node exceeded its limit | Narrow the work; scraping a heavy page is the usual culprit |
| `rate_limit` | External API throttled you | Auto-retries; if persistent, insert a `delay` node upstream |

---

## Expressions that resolve to empty

Almost always one of three things:

1. **The field isn't there.** Run the automation once, `get_execution_logs`, and read
   the upstream node's *actual* output. Build the path from what you see, never from
   what the API docs imply.
2. **Wrong node reference.** `$node` is keyed by node **id**. Hyphenated ids are
   rewritten automatically, but `$node["My Step"]` with a label is not an id.
3. **Mixed vs. exact.** `"{{ $json.items }}"` alone returns the real array;
   `"count: {{ $json.items }}"` stringifies it. If a node needs an array, the
   expression must be the entire string.

A failed expression yields `null` and logs a warning — it does not stop the run. That
makes it the quietest failure mode in the system. Check output values, not just
status.

---

## Activation refused

`activate_automation` validates first. Exact messages and their causes:

| Message | Cause |
|---------|-------|
| `No trigger node found. Please save your workflow before activating.` | `entryNodeId` missing |
| `entryNodeId does not exist in nodes` | Entry points at a deleted node |
| `Edge from unknown node: <id>` / `Edge to unknown node: <id>` | Edge references a node not in `nodes` |
| `Unreachable node detected: <id>` | Node has no path from the trigger — connect it or delete it |
| `Cycle detected at node: <id>` | The graph loops back on itself; use a `loop` node for repetition, not a back-edge |
| `Cron trigger requires a schedule.` | `cron_trigger` with no `schedule` / `customCron` |
| `Cron trigger has an invalid schedule expression: "…"` | Bad cron syntax |
| `GitHub trigger requires a repository (owner/repo).` | Missing `repo` |
| `GitHub trigger requires a connected GitHub account.` | OAuth credential not connected |
| `Stripe trigger requires a Stripe secret key.` | Missing `stripeKeyCredential` |

App triggers that register real webhooks (GitHub, Stripe, and friends) do so **at
activation**. Activation is therefore the first moment their credentials are truly
tested — expect failures here, not at save time.

---

## Common self-inflicted mistakes

**Wired an `operation` into a trigger.** Triggers listen; they don't act. `get_node`
on a trigger deliberately withholds operations. To act on Slack, use `slack`, not
`slack_trigger`.

**Used a non-runnable node.** `list_nodes` flags these `⚠ not runnable yet`. The
workflow saves and activates and then does nothing. See `reference/catalog.md`.

**Missing `sourceHandle` on a condition.** Edges leaving a `condition` must carry
`"true"` or `"false"`. Without it, routing is undefined.

**Guessed a config field name.** Unknown keys are written and silently ignored — no
error, no output, nothing in the logs. If `get_node` says
`Config fields: not documented yet`, read an existing automation that uses the node
instead of inventing the shape.

**Never ran it.** A saved automation is not a working one. `run_automation` on a
manual trigger, then read the logs. Do this before you tell the user it's done.

---

## Investigating a failure

```
list_executions { automation: "<name>", status: "failed" }
get_execution_logs { execution: "<id>" }
```

The logs give you per-node status, the error category, the hint, and the actual
output of every node that ran. `get_execution` adds the input/output payloads when
the logs alone aren't enough. Read them before changing anything — the hint usually
names the fix outright.
