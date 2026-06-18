import axios from "axios";
import jwt from "jsonwebtoken";
import { JWT_SECRET, FRONTEND_URL } from "../../config/env.js";

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
    name: "list_credentials",
    description:
      "List the user's saved credentials by name and type. Secrets are never returned.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async (_args, api) => {
      const data = pick(await api.get("/credentials"));
      const creds = data.credentials || [];
      if (!creds.length) return "No saved credentials.";
      return creds.map((c) => `• ${c.name} (${c.type || c.provider || "credential"})`).join("\n");
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
