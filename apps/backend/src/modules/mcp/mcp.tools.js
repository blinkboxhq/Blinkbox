import axios from "axios";
import jwt from "jsonwebtoken";
import { JWT_SECRET, FRONTEND_URL } from "../../config/env.js";
import { listPickerNodes, getPickerNode, PICKER_NODES } from "../../nodes/nodeCatalog.js";
import { listActions, defaultOperation } from "../../nodes/integrationManifest.js";
import { listResourceKinds } from "../../nodes/integrationResources.js";
import { describeNodeFields, credentialTypesFor } from "../../nodes/nodeFields.js";

// Tools reach the platform through its own REST API over loopback, authenticating
// with a short-lived JWT minted for the connector's owner. This reuses every
// existing auth check, validator, and workspace-isolation guard verbatim — the
// connector can never do anything the user couldn't do in the browser.
const INTERNAL_BASE = `http://127.0.0.1:${process.env.PORT || 3000}/api`;

function makeClient(userId) {
  const token = jwt.sign({ id: userId, role: "user" }, JWT_SECRET, { expiresIn: "2m" });
  return axios.create({
    baseURL: INTERNAL_BASE,
    timeout: 120000,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    validateStatus: () => true,
  });
}

function pick(res) {
  if (res.status >= 200 && res.status < 300) return res.data;
  const msg =
    res.data?.message ||
    res.data?.error ||
    (res.data?.issues && JSON.stringify(res.data.issues)) ||
    `request failed (HTTP ${res.status})`;
  throw new Error(msg);
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

async function resolveAutomationId(api, ref) {
  if (!ref) throw new Error("Provide an automation name or id.");
  const r = String(ref).trim();
  if (OBJECT_ID.test(r)) return r;
  const data = pick(await api.get("/automation", { params: { limit: 50 } }));
  const list = data.automations || [];
  const needle = r.toLowerCase();
  const hit =
    list.find((a) => (a.name || "").toLowerCase() === needle) ||
    list.find((a) => (a.name || "").toLowerCase().includes(needle));
  if (!hit) throw new Error(`No automation matching "${ref}". Run list_automations to see exact names.`);
  return hit._id;
}

function deriveName(prompt) {
  const s = String(prompt || "").trim().replace(/\s+/g, " ");
  if (!s) return "New automation";
  return s.length > 60 ? s.slice(0, 57) + "…" : s;
}

// Map Brian's canvas flow (nodes carry `backendType`) onto the save schema
// (nodes carry `type`) — the same shape the visual builder persists.
function flowToWorkflow(flow, name) {
  const nodes = (flow.nodes || [])
    .map((n) => ({
      id: n.id,
      type: n.backendType || n.data?.backendType || n.type || n.data?.type,
      data: n.data || {},
      position: n.position || { x: n.x || 0, y: n.y || 0 },
    }))
    .filter((n) => n.id && n.type);
  const edges = (flow.edges || [])
    .map((e) => ({
      id: e.id || `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    }))
    .filter((e) => e.source && e.target);
  const triggerNode =
    (flow.nodes || []).find((n) => (n.data?.type || n.type) === "trigger") || flow.nodes?.[0];
  const triggerType = triggerNode
    ? triggerNode.backendType || triggerNode.data?.backendType || triggerNode.type
    : "manualTrigger";
  return {
    name,
    trigger: triggerType || "manualTrigger",
    nodes,
    edges,
    entryNodeId: triggerNode?.id || nodes[0]?.id || "",
    description: "",
  };
}

// ── Universal-API guards ──────────────────────────────────────────────────────
// blinkbox_api gives the connected model full control of Blinkbox: any REST
// route, any method, run as the user. Three safety layers keep "do anything"
// from meaning "do anything to anyone":
//   1. SSRF — only relative same-origin API paths; no external URLs or traversal.
//   2. Privilege/money — a small block-list of areas the connector must never
//      touch (auth, admin, oauth, billing, key/connector self-management).
//   3. Destructive intent — DELETE and other destructive verbs require an
//      explicit confirm:true, so a vague or injected instruction can't wipe data.
const ALL_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);

// Areas off-limits to the connector — privilege escalation, real money, or the
// connector acting on its own auth. Everything else in the app is fully open.
const BLOCKED_PREFIXES = [
  "auth",      // login / register / password reset / token issuance
  "admin",     // privileged admin surface (requireAdmin)
  "oauth",     // OAuth authorize/callback — token exchange
  "billing",   // checkout / portal / webhook — moves real money
  "keys",      // minting/revoking MCP API keys (connector self-management)
  "mcp",       // the connector talking to itself
];

function normalizeApiPath(raw) {
  if (!raw || typeof raw !== "string") throw new Error("path is required.");
  let p = raw.trim();
  // Reject anything that isn't a same-origin relative API path — closes SSRF.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p) || p.startsWith("//")) {
    throw new Error("path must be a relative Blinkbox API path like '/automation', not a full URL.");
  }
  if (p.includes("..")) throw new Error("path traversal is not allowed.");
  p = p.replace(/^\/?api\//, "/").replace(/^\/+/, "/");
  if (!p.startsWith("/")) p = "/" + p;
  const segment = p.split(/[/?]/).filter(Boolean)[0] || "";
  if (BLOCKED_PREFIXES.includes(segment.toLowerCase())) {
    throw new Error(
      `The '${segment}' area is off-limits to the connector for safety ` +
        `(auth, admin, billing, oauth and key management are blocked). Everything else is allowed.`,
    );
  }
  return { path: p, segment };
}

// ── Node-catalog helpers ──────────────────────────────────────────────────────
// The connector may only ever name a node the user can reach from a picker —
// anything else is invisible in the builder, so a workflow containing it would
// be uneditable. resolveNode is the single gate that enforces that.
function resolveNode(ref) {
  const raw = String(ref || "").trim();
  if (!raw) throw new Error("Provide a node key. Run list_nodes to browse the catalog.");
  const hit = getPickerNode(raw) || getPickerNode(raw.toLowerCase());
  if (hit) return hit;
  const needle = raw.toLowerCase().replace(/[\s-]+/g, "_");
  const stem = needle.slice(0, 3);
  const near = PICKER_NODES.filter((n) => {
    const k = n.key.toLowerCase();
    const l = n.label.toLowerCase();
    return (
      k.includes(needle) ||
      l.includes(needle) ||
      (stem.length === 3 && (k.startsWith(stem) || l.startsWith(stem)))
    );
  }).slice(0, 8);
  throw new Error(
    `"${raw}" is not a node the user can see in any Blinkbox picker, so it can't be used.` +
      (near.length
        ? ` Closest matches: ${near.map((n) => n.key).join(", ")}.`
        : " Run list_nodes to browse what's available."),
  );
}

function isTrigger(n) {
  return n.category === "trigger" || n.pickers.join() === "trigger";
}

function nodeLine(n) {
  const tags = [n.pickers.join("+")];
  if (n.category && n.category !== "trigger") tags.push(n.category);
  if (n.integration && !isTrigger(n)) tags.push("has actions");
  if (n.oauthProvider) tags.push(`${n.oauthProvider} oauth`);
  if (!n.executable) tags.push("⚠ not runnable yet");
  return `• ${n.key} — ${n.label} [${tags.join(", ")}]`;
}

// Output handles mirror CustomNode.jsx: `condition` always forks true/false,
// loop/merge and triggers are single-output, and every other action node can opt
// into a success/failed fork by setting config.splitOutputs = true.
const NO_SPLIT = new Set(["condition", "loop", "merge"]);

function handlesFor(n) {
  if (n.key === "condition")
    return 'Two outputs: sourceHandle "true" and sourceHandle "false" — connect both branches.';
  if (n.category === "trigger" || NO_SPLIT.has(n.key)) return 'Single output (sourceHandle "output").';
  return 'Single output (sourceHandle "output"). Set config.splitOutputs = true to fork into "success" and "failed" handles.';
}

// The 7 providers whose credentials are minted by a browser consent screen —
// they can never be created from chat, only linked from the Credentials page.
const OAUTH_PROVIDERS = new Set(["google", "slack", "microsoft", "github", "airtable", "notion", "meta"]);

function credentialsPageHint(provider) {
  return (
    `${provider} uses OAuth, so it can't be connected from chat — it needs a browser consent screen. ` +
    `Ask the user to open ${FRONTEND_URL}/credentials and click Connect on ${provider}, then run list_credentials again. ` +
    `Never ask them to paste an OAuth token.`
  );
}

function matchesNode(cred, n) {
  const t = String(cred.type || "").toLowerCase();
  const p = String(cred.provider || "").toLowerCase();
  const panelTypes = credentialTypesFor(n);
  return (
    (n.oauthProvider && (p === n.oauthProvider || t === n.oauthProvider)) ||
    t === n.key ||
    (n.integration && t === n.integration) ||
    panelTypes.includes(t) ||
    panelTypes.includes(p)
  );
}

// What `type` a credential for this node should be stored under, so the node's
// panel finds it later.
function credentialTypeFor(n) {
  return credentialTypesFor(n)[0] || n?.integration || n?.key || "api_key";
}

// Which config key holds the credential id. Most nodes use credentialId, but a
// trigger panel names its own (figma_trigger stores it under `token`).
async function credentialSlot(n) {
  const fields = (await describeNodeFields(n)).fields.filter((f) => f.t === "credential");
  return fields.length === 1 ? fields[0].k : "credentialId";
}

async function userCredentials(api) {
  try {
    const data = pick(await api.get("/credentials"));
    return data.credentials || [];
  } catch {
    return [];
  }
}

export const TOOLS = [
  {
    name: "list_automations",
    description:
      "List the user's Blinkbox automations (workflows) with their on/off status, trigger, and id.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async (_args, api) => {
      const data = pick(await api.get("/automation", { params: { limit: 50 } }));
      const items = data.automations || [];
      if (!items.length)
        return "No automations yet. Use create_automation to build one from a plain-English description.";
      const lines = items.map((a) => {
        const status = a.active ? "🟢 active" : "⚪ inactive";
        return `• ${a.name || "Untitled"} — ${status} — trigger: ${a.trigger || "—"} — ${a.nodeCount ?? "?"} steps (id: ${a._id})`;
      });
      return `You have ${items.length} automation(s):\n${lines.join("\n")}`;
    },
  },
  {
    name: "get_automation",
    description: "Get full details of one automation by name or id: status, trigger, and its steps.",
    inputSchema: {
      type: "object",
      properties: { automation: { type: "string", description: "Automation name or id" } },
      required: ["automation"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const id = await resolveAutomationId(api, args.automation);
      const data = pick(await api.get(`/automation/${id}`));
      const a = data.automation || {};
      const nodes = a.nodes || [];
      const steps = nodes
        .map((n, i) => `  ${i + 1}. ${n.data?.label || n.type} (${n.type})`)
        .join("\n");
      return [
        `Name: ${a.name}`,
        `Status: ${a.active ? "active" : "inactive"}`,
        `Trigger: ${a.trigger || "—"}`,
        `Description: ${a.description || "—"}`,
        `Steps (${nodes.length}):`,
        steps || "  (none)",
        `Id: ${a._id}`,
      ].join("\n");
    },
  },
  {
    name: "run_automation",
    description:
      "Run an automation now by name or id (works whether it's active or not). Optionally pass input data. Returns the execution id.",
    inputSchema: {
      type: "object",
      properties: {
        automation: { type: "string", description: "Automation name or id" },
        input: {
          type: "object",
          description: "Optional input data passed to the workflow",
          additionalProperties: true,
        },
      },
      required: ["automation"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const id = await resolveAutomationId(api, args.automation);
      const data = pick(await api.post(`/execution/start/${id}`, args.input || {}));
      const ex = data.execution || {};
      return `Started run ${ex._id || "(pending)"} — status: ${ex.status || "queued"}. Use get_execution with that id to check the result.`;
    },
  },
  {
    name: "get_execution",
    description: "Check the status and result of a workflow run by its execution id.",
    inputSchema: {
      type: "object",
      properties: { execution_id: { type: "string" } },
      required: ["execution_id"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const data = pick(await api.get(`/execution/${args.execution_id}`));
      const ex = data.execution || {};
      return [
        `Execution ${ex._id}`,
        `Status: ${ex.status}`,
        ex.error || ex.errorMessage ? `Error: ${ex.error || ex.errorMessage}` : null,
        ex.createdAt ? `Started: ${ex.createdAt}` : null,
        ex.finishedAt || ex.updatedAt ? `Updated: ${ex.finishedAt || ex.updatedAt}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  {
    name: "get_execution_logs",
    description: "Get the step-by-step logs for a workflow run by execution id.",
    inputSchema: {
      type: "object",
      properties: { execution_id: { type: "string" } },
      required: ["execution_id"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const data = pick(await api.get(`/execution/${args.execution_id}/logs`));
      const logs = data.logs || [];
      if (!logs.length) return "No logs for this execution yet.";
      return logs
        .map((l) => {
          const where = l.nodeLabel || l.nodeType || l.nodeId || "step";
          const status = l.status || l.level || "";
          const msg = l.message || l.error || "";
          return `[${status}] ${where}${msg ? " — " + msg : ""}`;
        })
        .join("\n");
    },
  },
  {
    name: "list_executions",
    description: "List recent runs of an automation (by name or id) with their statuses.",
    inputSchema: {
      type: "object",
      properties: { automation: { type: "string" } },
      required: ["automation"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const id = await resolveAutomationId(api, args.automation);
      const data = pick(await api.get(`/execution/automation/${id}`));
      const list = data.executions || [];
      if (!list.length) return "No runs yet for this automation.";
      return list
        .slice(0, 20)
        .map((e) => `• ${e._id} — ${e.status} — ${e.createdAt || ""}`)
        .join("\n");
    },
  },
  {
    name: "activate_automation",
    description:
      "Turn an automation ON (by name or id) so its trigger runs it automatically. The workflow is validated first; if it's incomplete this returns why.",
    inputSchema: {
      type: "object",
      properties: { automation: { type: "string" } },
      required: ["automation"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const id = await resolveAutomationId(api, args.automation);
      pick(await api.post(`/automation/${id}/activate`, {}));
      return "✅ Activated. It will now run automatically when its trigger fires.";
    },
  },
  {
    name: "deactivate_automation",
    description: "Turn an automation OFF (by name or id) so it stops running automatically.",
    inputSchema: {
      type: "object",
      properties: { automation: { type: "string" } },
      required: ["automation"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const id = await resolveAutomationId(api, args.automation);
      pick(await api.post(`/automation/${id}/deactivate`, {}));
      return "⚪ Deactivated. It will no longer run automatically.";
    },
  },
  {
    name: "rename_automation",
    description: "Rename an automation (look it up by current name or id).",
    inputSchema: {
      type: "object",
      properties: {
        automation: { type: "string", description: "Current name or id" },
        name: { type: "string", description: "New name" },
      },
      required: ["automation", "name"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const id = await resolveAutomationId(api, args.automation);
      pick(await api.patch(`/automation/${id}/rename`, { name: args.name }));
      return `Renamed to "${args.name}".`;
    },
  },
  {
    name: "delete_automation",
    description: "Permanently delete an automation by name or id. This cannot be undone.",
    inputSchema: {
      type: "object",
      properties: { automation: { type: "string" } },
      required: ["automation"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const id = await resolveAutomationId(api, args.automation);
      pick(await api.delete(`/automation/${id}`));
      return "🗑️ Automation deleted.";
    },
  },
  {
    name: "list_nodes",
    description:
      "Browse or search Blinkbox's node catalog — the building blocks of a workflow. Only nodes the user can actually reach from a picker are listed, so anything returned here is safe to build with. " +
      "Filter by picker ('trigger' = what starts a workflow, 'action' = a step, 'agent' = AI-agent models/memory/tools), by category, or by free-text search over the name and key. " +
      "Use this to find real node keys before create_automation, then get_node to learn how to configure one.",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Free-text match on node name or key, e.g. 'slack', 'sheet', 'delay'",
        },
        picker: {
          type: "string",
          enum: ["trigger", "action", "agent"],
          description: "Restrict to one picker surface",
        },
        category: {
          type: "string",
          description: "Restrict to one category, e.g. 'apps', 'logic', 'ai_agent', 'trigger'",
        },
        include_unavailable: {
          type: "boolean",
          description:
            "Include catalog-only nodes that have no backend handler yet. They appear in the UI but cannot run — default false.",
        },
      },
      additionalProperties: false,
    },
    handler: async (args) => {
      const needle = String(args.search || "").trim().toLowerCase();
      let rows = listPickerNodes({
        picker: args.picker,
        category: args.category,
        buildableOnly: args.include_unavailable !== true,
      });
      if (needle) {
        rows = rows.filter(
          (n) => n.key.toLowerCase().includes(needle) || n.label.toLowerCase().includes(needle),
        );
      }
      if (!rows.length) {
        return `Nothing in the catalog matches that (${PICKER_NODES.length} picker-visible nodes total). Try a broader search, or drop the picker/category filter.`;
      }
      const shown = rows.slice(0, 120);
      const more =
        rows.length > shown.length
          ? `\n…and ${rows.length - shown.length} more — narrow it with search, picker or category.`
          : "";
      return `${rows.length} node(s):\n${shown.map(nodeLine).join("\n")}${more}`;
    },
  },
  {
    name: "get_node",
    description:
      "Get everything needed to configure one node: its config fields (key, type, whether it's required, an example value, what it means), the output fields later steps can reference as {{ $json.field }}, whether it needs a credential and whether the user already has one, its output handles, and whether it exposes app actions. " +
      "This is the node's configuration panel expressed as data — read it before filling a node's config instead of guessing field names.",
    inputSchema: {
      type: "object",
      properties: {
        node: {
          type: "string",
          description: "Node key from list_nodes, e.g. 'slack', 'http_request', 'gmail_trigger'",
        },
        event: {
          type: "string",
          description:
            "For a trigger: the event id to configure for. Returns that event's exact config skeleton plus any fields only it needs.",
        },
      },
      required: ["node"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const n = resolveNode(args.node);
      const schema = await describeNodeFields(n, args.event);
      const out = [
        `${n.label} (${n.key})`,
        `Category: ${n.category || "—"} · Pickers: ${n.pickers.join(", ")}`,
      ];

      if (!n.executable) {
        out.push(
          "⚠️ NOT RUNNABLE: this node appears in the builder but has no backend handler yet. Do not put it in a workflow — pick a different node.",
        );
      }
      if (schema.hint) out.push(`How it connects: ${schema.hint}`);

      if (args.event && schema.events && !schema.event) {
        out.push(
          `⚠️ "${args.event}" is not an event of this trigger — pick one of the ids listed below.`,
        );
      }

      if (schema.source === "none") {
        out.push(
          "Config fields: not documented yet. Configure it in the builder, or inspect an existing automation that already uses it before assuming field names.",
        );
      } else if (schema.fields.length) {
        const req = schema.fields.filter((f) => f.r);
        const opt = schema.fields.filter((f) => !f.r);
        const render = (f) =>
          `  - ${f.k} (${f.t})${f.d ? ` — ${f.d}` : ""}` +
          (f.opts ? `  one of: ${f.opts.join(" | ")}` : "") +
          (f.ex !== undefined && f.ex !== "" ? `  e.g. ${JSON.stringify(f.ex)}` : "");
        out.push(`Config fields:`);
        if (req.length) out.push(` Required:\n${req.map(render).join("\n")}`);
        if (opt.length) out.push(` Optional:\n${opt.map(render).join("\n")}`);
      } else {
        out.push("Config fields: none — this node needs no configuration.");
      }

      if (schema.event) {
        out.push(
          `Event "${schema.event.id}" (${schema.event.label}) — start from this exact config and add the fields above:\n  ${JSON.stringify(schema.event.cfg)}`,
        );
      } else if (schema.events?.length) {
        const listed = schema.events.slice(0, 40);
        out.push(
          `Events (${schema.events.length}) — pick one and re-run get_node with event: "<id>" for its exact config:\n` +
            listed.map((e) => `  - ${e.id}${e.d ? ` — ${e.d}` : ` — ${e.label}`}`).join("\n") +
            (schema.events.length > listed.length
              ? `\n  …and ${schema.events.length - listed.length} more`
              : ""),
        );
      }

      if (schema.outDocs?.length) {
        out.push(
          `Outputs (reference downstream as {{ $json.<field> }}):\n` +
            schema.outDocs.map(([k, d]) => `  - ${k}${d ? ` — ${d}` : ""}`).join("\n"),
        );
      } else if (schema.out?.length) {
        out.push(`Outputs (reference downstream as {{ $json.<field> }}): ${schema.out.join(", ")}`);
      } else if (schema.passthrough) {
        out.push(
          "Outputs: whatever the app's API returns for the chosen operation — run the node once and read the execution log to see the shape.",
        );
      }

      if (schema.passthrough) {
        out.push(
          "Any other parameters the operation takes go in the same config object alongside `operation` — see list_node_actions.",
        );
      }

      out.push(`Handles: ${handlesFor(n)}`);

      // A trigger only listens; the app's operations belong to its action node, so
      // never advertise them here or the model will wire an `operation` into a trigger.
      if (n.integration && isTrigger(n)) {
        out.push(
          `This node only listens for events. To act on ${n.integration}, add the "${n.integration}" action node and see list_node_actions.`,
        );
      } else if (n.integration) {
        const actions = await listActions(n.integration);
        const def = await defaultOperation(n.integration);
        out.push(
          `Actions: ${actions.length} operation(s)${def ? `, default "${def}"` : ""} — run list_node_actions with node "${n.key}" to see them and their parameters.`,
        );
      }

      // A trigger panel names its own credential field and type (e.g. token /
      // credType "figma"), so match on that too — not just the node's provider.
      const credFields = schema.fields.filter((f) => f.t === "credential");
      const credTypes = [...new Set(credFields.map((f) => f.credType).filter(Boolean))];
      if (n.oauthProvider || n.integration || credFields.length) {
        const all = await userCredentials(api);
        const creds = all.filter(
          (c) =>
            matchesNode(c, n) ||
            credTypes.includes(String(c.type || "").toLowerCase()) ||
            credTypes.includes(String(c.provider || "").toLowerCase()),
        );
        const slot = credFields.length === 1 ? credFields[0].k : "credentialId";
        const need = n.oauthProvider
          ? `Needs a ${n.oauthProvider} OAuth credential.`
          : credTypes.length
            ? `Needs a saved ${credTypes.join(" or ")} credential.`
            : "May need a credential (API key or token).";
        out.push(
          creds.length
            ? `${need} Already connected: ${creds.map((c) => `${c.name} (id: ${c._id})`).join(", ")} — set config.${slot} to one of these ids.`
            : `${need} None saved yet — ${n.oauthProvider ? `have the user connect it at ${FRONTEND_URL}/credentials` : "use create_credential"}.`,
        );
      }

      return out.join("\n");
    },
  },
  {
    name: "list_node_actions",
    description:
      "List the operations an app node can perform — e.g. slack → send_message, list_channels — with what each one does, the OAuth scopes it needs, and which is the default. Also lists the resource pickers the node offers (channels, sheets, bases…) that resolve live from the user's credential. " +
      "Use this to choose a node's 'operation' value and know which parameters go with it.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "App node key, e.g. 'slack', 'github', 'google_sheets'" },
        search: { type: "string", description: "Optional filter over operation keys and labels" },
      },
      required: ["node"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const n = resolveNode(args.node);
      if (!n.integration) {
        return `${n.label} (${n.key}) has no operation list — it's a single-purpose node. Run get_node for its config fields.`;
      }
      if (isTrigger(n)) {
        return `${n.label} (${n.key}) is a trigger — it listens for events rather than performing operations. Run get_node for how to configure it; to act on ${n.integration}, use the "${n.integration}" action node.`;
      }
      const all = await listActions(n.integration);
      const def = await defaultOperation(n.integration);
      const needle = String(args.search || "").trim().toLowerCase();
      const actions = needle
        ? all.filter(
            (a) =>
              a.key.toLowerCase().includes(needle) || a.label.toLowerCase().includes(needle),
          )
        : all;
      if (!actions.length) {
        return `No operations on ${n.key} match "${args.search}". It has ${all.length} in total — call again without a search.`;
      }

      const lines = actions.slice(0, 150).map((a) => {
        const bits = [];
        if (a.recommended || a.key === def) bits.push("default");
        if (a.scopes.length) bits.push(`scopes: ${a.scopes.join(" ")}`);
        const params = a.params ? Object.keys(a.params) : null;
        if (params?.length) bits.push(`params: ${params.join(", ")}`);
        return `• ${a.key} — ${a.label}${a.description ? ` — ${a.description}` : ""}${bits.length ? ` [${bits.join(" · ")}]` : ""}`;
      });

      const out = [
        `${n.label} (${n.key}) — ${actions.length}${actions.length !== all.length ? ` of ${all.length}` : ""} operation(s)${def ? `, default "${def}"` : ""}:`,
        ...lines,
      ];
      if (actions.length > 150) out.push(`…and ${actions.length - 150} more — narrow with search.`);

      const kinds = listResourceKinds(n.integration);
      if (kinds.length) {
        out.push(
          `Resource pickers (resolve live once a credential is set): ${kinds.map((k) => `${k.kind} → config.${k.param}`).join(", ")}`,
        );
      }
      if (!actions.some((a) => a.params)) {
        out.push(
          "Parameters aren't declared for this app yet — pass the app's own field names in the node config and confirm with a test run.",
        );
      }
      return out.join("\n");
    },
  },
  {
    name: "list_credentials",
    description:
      "List the user's saved credentials by name, type and id. Secrets are never returned. " +
      "Pass a node key to see only the credentials that node can use, plus what's still missing for it.",
    inputSchema: {
      type: "object",
      properties: {
        node: {
          type: "string",
          description: "Optional node key — narrows the list to credentials that node accepts",
        },
      },
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const creds = (await userCredentials(api)).map((c) => ({
        line: `• ${c.name} (${c.type || c.provider || "credential"}) — id: ${c._id}`,
        raw: c,
      }));
      if (!args.node) {
        return creds.length
          ? `${creds.length} saved credential(s):\n${creds.map((c) => c.line).join("\n")}`
          : "No saved credentials yet. Use create_credential for API keys, or have the user connect an app at " +
              `${FRONTEND_URL}/credentials for OAuth apps.`;
      }
      const n = resolveNode(args.node);
      const mine = creds.filter((c) => matchesNode(c.raw, n));
      if (mine.length) {
        return `${n.label} (${n.key}) can use:\n${mine.map((c) => c.line).join("\n")}\nSet config.${await credentialSlot(n)} to one of these ids.`;
      }
      return n.oauthProvider
        ? `${n.label} (${n.key}) has no credential yet. ${credentialsPageHint(n.oauthProvider)}`
        : `${n.label} (${n.key}) has no credential yet. If it needs an API key, use create_credential with node "${n.key}".`;
    },
  },
  {
    name: "create_credential",
    description:
      "Save a new credential so nodes can authenticate. Use this for API-key / token style credentials — pass a name and the secret value. " +
      "OAuth apps (Google/Gmail/Sheets/Drive/Calendar, Slack, Microsoft/Outlook/Teams, GitHub, Airtable, Notion, Meta/WhatsApp) cannot be connected from chat because they need a browser consent screen; for those this returns the page to click Connect on instead. Never ask the user to paste an OAuth token.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Label for the credential, e.g. 'Stripe live key'" },
        secret: { type: "string", description: "The API key or token value. Required for non-OAuth credentials." },
        node: {
          type: "string",
          description:
            "Node key this credential is for, e.g. 'stripe' — sets the credential type and detects OAuth apps",
        },
        type: {
          type: "string",
          description:
            "Credential type override. Leave empty — it defaults to the type the node's own config panel looks for, which is what makes the credential show up there.",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const n = args.node ? resolveNode(args.node) : null;
      const provider = n?.oauthProvider || (OAUTH_PROVIDERS.has(args.type) ? args.type : null);
      if (provider) return credentialsPageHint(provider);
      if (!args.secret) {
        throw new Error(
          "secret is required to save an API-key credential. Ask the user for the key from the app's own dashboard.",
        );
      }
      const type = args.type || credentialTypeFor(n);
      const data = pick(
        await api.post("/credentials", { name: args.name, secret: args.secret, type }),
      );
      const saved = data.credential || {};
      const slot = n ? await credentialSlot(n) : "credentialId";
      return `✅ Saved credential "${saved.name || args.name}" (${saved.type || type}) — id: ${saved._id || "?"}. Set config.${slot} to that id on the nodes that need it. The secret is stored encrypted and never read back.`;
    },
  },
  {
    name: "create_automation",
    description:
      "Build a brand-new automation from a plain-English description using Blinkbox's AI builder. Example: 'When a Stripe payment succeeds, send me a Slack DM'. Optionally activate it immediately.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Plain-English description of the automation to build",
        },
        name: { type: "string", description: "Optional name for the new automation" },
        activate: {
          type: "boolean",
          description: "If true, turn the automation on right after creating it",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const brian = pick(
        await api.post("/brian/chat", { messages: [{ role: "user", content: args.prompt }] }),
      );
      const flow = brian.flow;
      if (!flow || !Array.isArray(flow.nodes) || !flow.nodes.length) {
        const qs =
          brian.questions && brian.questions.length
            ? `\n\nTo build it I need a bit more detail:\n- ${brian.questions.join("\n- ")}`
            : "";
        return `I couldn't build a complete workflow from that yet.${qs}\n\n${brian.text || ""}`.trim();
      }

      const body = flowToWorkflow(flow, args.name || deriveName(args.prompt));
      const saveRes = await api.post("/automation", body);
      if (saveRes.status < 200 || saveRes.status >= 300) {
        const why = saveRes.data?.issues
          ? JSON.stringify(saveRes.data.issues)
          : saveRes.data?.message || saveRes.data?.error || `HTTP ${saveRes.status}`;
        return `I designed the workflow but couldn't auto-save it (${why}). Here's the plan so you can finish it in the builder:\n\n${brian.text || ""}`;
      }

      const saved = saveRes.data.automation || {};
      let out = `✅ Created "${saved.name}" (id: ${saved._id}).\nOpen it: ${FRONTEND_URL}/workspace/${saved._id}`;
      if (args.activate) {
        const act = await api.post(`/automation/${saved._id}/activate`, {});
        out +=
          act.status >= 200 && act.status < 300
            ? "\n🟢 Activated — it's live."
            : `\n⚠️ Created but couldn't activate yet: ${act.data?.message || act.data?.error || "validation failed"}. Open it in the builder to finish setup.`;
      }
      return out;
    },
  },
  {
    name: "blinkbox_api",
    description:
      "Full control of Blinkbox: call ANY Blinkbox REST endpoint the user owns, with any HTTP method. Use this for anything the named tools above don't already do — analytics, profile, workspace members/invites, credentials, versions, feedback, duplicating/updating workflows, resuming/retrying/cancelling runs, and more. " +
      "Discover routes by reading what the app does; pass a relative API path (e.g. '/analytics/overview', '/profile', '/automation/<id>/duplicate'), the HTTP method, and an optional JSON body. " +
      "Methods: GET, POST, PATCH, PUT, DELETE. Anything destructive (DELETE, or POST/PUT/PATCH to a route that removes/cancels/overwrites) requires confirm:true — set it only when the user clearly asked to delete or replace something. " +
      "Off-limits for safety: auth, admin, billing, oauth, and API-key/connector management. Everything runs as the user, scoped to their own workspace, through every normal validation.",
    inputSchema: {
      type: "object",
      properties: {
        method: {
          type: "string",
          enum: ["GET", "POST", "PATCH", "PUT", "DELETE"],
          description: "HTTP method",
        },
        path: {
          type: "string",
          description: "Relative Blinkbox API path, e.g. '/analytics/overview' or '/automation/<id>'. Never a full URL.",
        },
        body: {
          type: "object",
          description: "Optional JSON request body for POST/PATCH/PUT.",
          additionalProperties: true,
        },
        confirm: {
          type: "boolean",
          description: "Set true to authorize a destructive call (DELETE, or a route that removes/cancels/overwrites). Required for those; ignored otherwise.",
        },
      },
      required: ["method", "path"],
      additionalProperties: false,
    },
    handler: async (args, api) => {
      const method = String(args.method || "").toUpperCase();
      if (!ALL_METHODS.has(method)) {
        throw new Error(`Method ${method || "(none)"} is not a valid HTTP method.`);
      }
      const { path } = normalizeApiPath(args.path);

      // Destructive-intent gate: DELETE is always destructive; mutating verbs are
      // treated as destructive when the path itself names a removal/overwrite.
      const destructivePath = /\/(delete|remove|cancel|reset|restore|kill)\b|\/collaborators\/|\/reject\b/i.test(path);
      const isDestructive = method === "DELETE" || (method !== "GET" && destructivePath);
      if (isDestructive && args.confirm !== true) {
        throw new Error(
          `This is a destructive ${method} on ${path}. Re-call with confirm:true only if the user clearly wants to delete/replace/cancel this.`,
        );
      }

      const hasBody = method !== "GET" && args.body && typeof args.body === "object";
      const res = await api.request({
        method,
        url: path,
        data: hasBody ? args.body : undefined,
      });
      const data = pick(res);
      const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      // Keep responses bounded so a huge list can't blow the model's context.
      return text.length > 12000 ? text.slice(0, 12000) + "\n…(truncated)" : text;
    },
  },
];

export function listToolSpecs() {
  return TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
}

export async function runTool(name, args, userId) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  const api = makeClient(userId);
  return tool.handler(args || {}, api);
}
