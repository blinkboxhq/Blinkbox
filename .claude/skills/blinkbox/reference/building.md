# Building workflows

`create_automation` is the default path. This file is for when you need to
hand-assemble a graph, edit an existing one, or reason about how data moves.

---

## Workflow anatomy

A saved automation is:

```jsonc
{
  "name": "Stripe → Slack",
  "trigger": "stripe_trigger",       // the entry node's type
  "entryNodeId": "n1",               // which node starts it
  "description": "",
  "nodes": [
    {
      "id": "n1",
      "type": "stripe_trigger",      // a real key from list_nodes
      "data": { /* flat config */ }, // the node's config object
      "description": "Payment succeeded",  // display label on the canvas
      "position": { "x": 0, "y": 0 }
    }
  ],
  "edges": [
    { "id": "n1-n2", "source": "n1", "target": "n2",
      "sourceHandle": null, "targetHandle": null }
  ]
}
```

- `type` **must** be a key `list_nodes` returned. Anything else is invisible in the
  builder and uneditable.
- `data` is the node's **flat config**. Canvas-saved nodes sometimes nest it as
  `data.config` — readers tolerate both (`data.config || data`), but write flat.
- `description` is the human label, not a doc comment.
- `position` matters for the canvas. Space nodes ~250px apart on x, or the graph
  lands in a pile.
- `entryNodeId` must point at the trigger node, and `trigger` must be its `type`.

Create with `POST /automation`, replace with `PUT /automation/<id>` — both via
`blinkbox_api`. **Always `get_automation` (or `blinkbox_api_get /automation/<id>`)
first and edit the real graph**; a PUT replaces everything you don't send.

---

## Expressions

Any config string can contain `{{ ... }}`. It's evaluated as **real JavaScript**
inside a hard-sandboxed V8 isolate (64 MB, ~200 ms, no `require`/`fs`/`net`/`fetch`).

**Scope:**

| Name | Is |
|------|-----|
| `$json` | the current item's data — the node's input payload |
| `$node` | map of node id → that node's output |
| `$ctx` | alias for `$node` |
| `$runIndex` | current item index inside a loop / batch |

Also available: `Math`, `Date`, `JSON`, `String`, `Number`, `Array`, `Object`,
`Boolean`, `RegExp`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`,
`encodeURIComponent`, `decodeURIComponent`.

```js
{{ $json.email }}
{{ $json.total * 1.1 }}
{{ $json.users.map(u => u.name).join(', ') }}
{{ $json.items.filter(i => i.active).length }}
{{ $node["http-request-1"].status === 200 ? "ok" : "fail" }}
{{ JSON.stringify($json) }}
```

Mixed templates work: `"Hi {{ $json.name }}, you have {{ $json.count }} items"`.

Earlier nodes are also reachable by a **slug** derived from their label — a Chat
Trigger labelled "Chat Trigger" is `{{ chat_trigger.output }}`. Ids are more stable;
prefer them.

Resolution is depth-limited to 20 levels. Keep expressions to transforms, not programs
— reach for the `code` node when logic gets real.

**Field names come from `get_node`'s Outputs section.** Referencing a field the
upstream node never emits is the single most common cause of a failed run.

---

## Handles (how edges connect)

`get_node` tells you per node. The rules:

| Node | Outputs |
|------|---------|
| `condition` | **two** — `sourceHandle: "true"` and `sourceHandle: "false"`. Wire both. |
| `loop`, `merge`, any trigger | single, `sourceHandle: "output"` |
| every other action | single `"output"`; set `config.splitOutputs = true` to fork into `"success"` and `"failed"` |

A `condition` with only the true branch wired silently drops everything that
evaluates false. If the user described an "otherwise", it needs the false edge.

`targetHandle` is `null` for ordinary data flow. It is **only** non-null for AI-agent
slots (below).

---

## Core logic nodes

```jsonc
// condition — fork on rules
{ "conditions": [{ "operator": "equals", "left": "{{$json.plan}}", "right": "enterprise" }],
  "mode": "and" }        // and = all must pass · or = any passes
// operators: equals | notEquals | contains | startsWith | endsWith |
//            greaterThan | lessThan | isEmpty

// loop — fan out over an array, one run per item
{ "arrayPath": "{{$json.items}}", "maxIterations": 1000 }
// outputs: item, index, total

// delay — pause and resume later
{ "mode": "duration", "amount": 5, "unit": "minutes" }
{ "mode": "until", "until": "2026-07-12T09:00:00Z" }

// merge — bring branches back together
{ "mode": "combine", "key": "merged" }   // combine | zip | concat

// filter_array
{ "arrayPath": "{{$json.results}}", "field": "status",
  "operator": "equals", "value": "active" }

// aggregate
{ "arrayPath": "{{$json.orders}}", "field": "total", "operations": ["sum", "avg"] }

// set_fields — add/overwrite fields on the payload
{ "fields": [{ "name": "fullName", "value": "{{$json.firstName}} {{$json.lastName}}" }] }

// code — JS, sandboxed. $input is the previous node's data. Return an object.
{ "code": "const d = $input;\nreturn { result: d.name?.toUpperCase() };" }

// http_request
{ "method": "POST", "url": "https://api.example.com/data",
  "headers": { "Content-Type": "application/json" },
  "body": "{{JSON.stringify($json)}}" }
// outputs: body, status, headers. SSRF-guarded — internal addresses are refused.
```

---

## Triggers

`cron_trigger` — `{ "schedule": "0 9 * * 1-5" }`. A standard cron expression;
**activation validates it** and rejects bad syntax with the exact reason.

`webhook` — `{ "method": "POST" }`. Outputs `body`, `headers`, `query`, `method`.
The URL is issued on save; read it from the automation or the builder.

`manual` / `chat_trigger` — no config. `chat_trigger` outputs `message`, `sessionId`,
`userId`.

App triggers (`slack_trigger`, `stripe_trigger`, `gmail_trigger`, …) have **events**.
Call `get_node` with `event: "<id>"` for that event's exact config skeleton. Several
verify webhook signatures automatically once activated.

A trigger **listens**; it never performs operations. To act on the same app, add its
action node.

---

## AI Agent

`ai_agent` is a node with **slot inputs** — other nodes connect *into* it on named
`targetHandle`s rather than feeding its data input:

| `targetHandle` | Slot | Nodes |
|----------------|------|-------|
| `llm` (or `chat_model`) | the model | `agent_openai`, `agent_anthropic`, `agent_gemini`, `agent_xai`, `agent_openrouter`, … |
| `memory` | conversation memory | `agent_memory` (vector), `agent_memory_window` (buffer) |
| `tools` | callable tools | app nodes with `pickers: ["action","agent"]` |

`ai_agent` config: `prompt` (required), `systemPrompt`, `model`, `credentialId`.
Outputs: `response`, `toolCalls`, `usage`.

Slot edges are excluded from the normal data-flow input — an agent still needs a
regular edge from whatever feeds it.

Use `list_nodes` with `picker: "agent"` to see everything that can fill a slot.

---

## Execution semantics worth knowing

- Nodes run along the graph, cursor by cursor, resumable across restarts.
- A false `condition` routes down the `"false"` edge — it is **not** a failure.
- `loop` fans out: downstream nodes run once per item, with `$runIndex` set.
- `delay` parks the execution and resumes it later; the run legitimately sits in a
  waiting state.
- Every node's output is stored, so any later node can reach it via `$node["<id>"]`.
- Transient failures retry; config, auth, expression, code, parse, quota, network and
  timeout errors do **not** — they're your bug to fix, not the platform's.
