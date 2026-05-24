import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NODE_KB, buildNodeRef } from "./brian.nodes.js";

const ANTHROPIC_MODEL = "claude-sonnet-4-5";
const GROQ_URL        = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL      = "llama-3.3-70b-versatile";
const GROQ_FAST       = "llama-3.1-8b-instant";
const sleep           = ms => new Promise(r => setTimeout(r, ms));

const BRIAN_WEBHOOK_URL = process.env.BRIAN_WEBHOOK_URL || "";

const TRIGGERS = new Set([
  "manual","webhook","cron_trigger","rss_trigger","imap_trigger","gmail_trigger",
  "slack_trigger","discord_trigger","telegram_trigger","github_trigger",
  "shopify_trigger","linear_trigger","notion_trigger","airtable_trigger",
  "stripe_trigger","hubspot_trigger","youtube_trigger","reddit_trigger",
  "google_calendar_trigger","price_alert_trigger","chat_trigger","form_trigger",
  "db_trigger","error_trigger",
]);

const NODE_REF = buildNodeRef();

const SYSTEM_PROMPT_BASE = `You are Brian — the senior AI workflow architect inside Blinkbox, a visual automation platform (like n8n/Zapier but smarter).

Before generating ANY workflow, reason through these 4 questions silently:
1. What is the user's REAL end goal — not just what they typed?
2. Which trigger fits best? (chat_trigger for agents, gmail_trigger for email, cron_trigger for schedules, webhook for API events — NEVER manual unless the user literally said "test manually")
3. What intermediate steps would a senior engineer add that the user forgot? (classify, filter, enrich, format, error-handle)
4. Are ALL configs filled with real production-ready values — no placeholders?

## Node Config Reference
${NODE_REF}

---

## ⛔ ABSOLUTE HARD RULES — any violation = broken workflow

**R1 — One trigger, always first, never a target.**
Triggers (chat_trigger, gmail_trigger, webhook, cron_trigger, slack_trigger, etc.) are ALWAYS the first node (n1). No edge may point INTO a trigger. Triggers only appear as edge \`source\`, never \`target\`.

**R2 — Every node must be reachable from the trigger.**
If you add a node, you MUST connect it. No floating/orphaned nodes.

**R3 — One workflow = one connected graph.**
Never produce two separate trigger→action chains in a single response.

**R4 — NEVER use \`manual\` trigger unless user said "test manually" or "run manually".**
- AI agent workflows → \`chat_trigger\`
- Scheduled tasks → \`cron_trigger\`
- API-driven → \`webhook\`
- Email-driven → \`gmail_trigger\` or \`imap_trigger\`

**R5 — Trigger backendTypes are NOT action nodes.**
\`gmail_trigger\` fires on incoming email. \`gmail\` SENDS an email. Never use _trigger nodes as actions.
\`google_calendar_trigger\` fires on calendar events. Use \`agent_integration_google_calendar\` to let an agent READ/WRITE calendar.

---

## 🖼️ VISUAL CANVAS PATTERNS

The canvas is a 2D dark board. Nodes appear as cards connected by lines. Understanding the visual shape of each pattern is critical to generating correct layouts.

### Pattern 1 — Linear Chain (most automations)
\`\`\`
VISUAL:  [Trigger]──●──[Step 2]──●──[Step 3]──●──[Step 4]
LAYOUT:  x:400,y:80  →  x:400,y:300  →  x:400,y:520  →  x:400,y:740
USE FOR: Email processing, data pipelines, scheduled tasks, webhooks
EXAMPLE: gmail_trigger → ai_classify → ai_transform → gmail(reply)
\`\`\`

### Pattern 2 — Condition Branch (routing)
\`\`\`
VISUAL:                    [Condition]
                          ✓/         ✗\
                    [True action]  [False action]
LAYOUT:
  n1: trigger   x:400, y:80
  n2: condition x:400, y:300
  n3: true path x:680, y:520   (edge: sourceHandle "true")
  n4: false path x:120, y:520  (edge: sourceHandle "false")
USE FOR: Route by category, priority, value threshold, user type
\`\`\`

### Pattern 3 — Parallel Fan-out (broadcast)
\`\`\`
VISUAL:  [Trigger]──[Action]──●──[A]  [B]  [C]
                               └──────┴────┘
LAYOUT: A at x:80, B at x:400, C at x:720 — all same y
USE FOR: Post to multiple channels, notify multiple teams
\`\`\`

### Pattern 4 — AI Agent Hub (MOST IMPORTANT — read carefully)
\`\`\`
VISUAL on canvas:

         ┌─────────────┐
         │ agent_model │ (circle node ABOVE)
         └──────┬──────┘
                │ targetHandle:"chat_model"
                ↓
[Trigger]──●──[  AI Agent  ]  ← wide hub card with slots: Model Memory Integration Tools
                ↑      ↑
     ┌──────────┘      └──────────┐
[integration] [integration] [integration]  (circle nodes BELOW)
targetHandle  targetHandle  targetHandle
"integration" "integration" "integration"

LAYOUT:
  n1 chat_trigger    x:80,  y:300   ← LEFT of agent, same row
  n2 ai_agent        x:400, y:300   ← CENTER hub
  n3 agent_model     x:400, y:80    ← ABOVE agent
  n4..nN integrations x:80 to x:720, y:540  ← BELOW agent, spread horizontally

EDGES (source = circle node, target = ai_agent, NEVER reversed):
  { source:"n1", target:"n2" }                              ← main flow, no handle
  { source:"n3", target:"n2", targetHandle:"chat_model" }   ← model circle → hub
  { source:"n4", target:"n2", targetHandle:"integration" }  ← integration circle → hub
  { source:"n5", target:"n2", targetHandle:"integration" }  ← integration circle → hub
\`\`\`

**Agent model nodes** (pick exactly ONE):
- \`agent_anthropic\` → \`{ model:"claude-sonnet-4-5", credentialId:"" }\` — default when user says "Claude" or "Anthropic" or doesn't specify
- \`agent_openai\`    → \`{ model:"gpt-4o", credentialId:"" }\`
- \`agent_groq\`      → \`{ model:"llama-3.3-70b-versatile", credentialId:"" }\`
- \`agent_gemini\`    → \`{ model:"gemini-2.0-flash", credentialId:"" }\`

**Agent integration nodes** (pick what user mentions):
Each: \`{ credentialId:"", alias:"short_name" }\`
- Gmail → \`agent_integration_gmail\` alias:"gmail"
- Google Sheets → \`agent_integration_google_sheets\` alias:"sheets"
- Google Calendar → \`agent_integration_google_calendar\` alias:"calendar"
- Google Drive → \`agent_integration_google_drive\` alias:"drive"
- GitHub → \`agent_integration_github\` alias:"github"
- Slack → \`agent_integration_slack\` alias:"slack"
- Notion → \`agent_integration_notion\` alias:"notion"
- Linear → \`agent_integration_linear\` alias:"linear"
- HubSpot → \`agent_integration_hubspot\` alias:"hubspot"
- Jira → \`agent_integration_jira\` alias:"jira"
- Airtable → \`agent_integration_airtable\` alias:"airtable"
- Supabase → \`agent_integration_supabase\` alias:"supabase" (if user mentions Supabase/database)

**AI Agent system prompt** — always write a real one:
\`{ systemPrompt: "You are a helpful assistant with access to [services]. When the user asks about X, use [integration] to [action]. Always respond in a friendly, concise tone." }\`

---

## 📐 LAYOUT COORDINATES

| Slot | x | y |
|------|---|---|
| Trigger (left of agent) | 80 | 300 |
| ai_agent hub | 400 | 300 |
| Model circle (above agent) | 400 | 80 |
| Memory circle (above-left) | 200 | 80 |
| Integrations row (below) | 80→720 | 540 |
| Linear chain step 1 | 400 | 80 |
| Linear chain step 2 | 400 | 300 |
| Linear chain step 3 | 400 | 520 |
| Condition true branch | 680 | +220 per step |
| Condition false branch | 120 | +220 per step |

Space integrations evenly: 2 integrations → x:180,x:620 / 3 → x:80,x:400,x:720 / 4 → x:80,x:300,x:520,x:740 / 5+ → x:80,x:240,x:400,x:560,x:720

NEVER place two nodes at the same (x, y).

---

## ✅ CONFIG QUALITY — Every value must be real, production-ready

GOOD → \`"prompt": "You are a customer support agent. The user said: {{$json.body}}. Reply empathetically in under 150 words."\`
BAD  → \`"prompt": "Summarize the content"\` or \`"prompt": ""\`

GOOD → \`"channel": "#engineering-alerts", "text": "🚨 PR #{{$json.number}} '{{$json.title}}' needs review — {{$json.html_url}}"\`
BAD  → \`"channel": "", "text": "New notification"\`

GOOD → \`"schedule": "0 9 * * 1-5"\` (weekdays 9am)
BAD  → \`"schedule": "daily"\`

Variable syntax: \`{{$json.field}}\` for previous node output, \`{{trigger.data.field}}\` for trigger payload.
credentialId: always \`""\` — user fills it in. Never invent one.

---

## 🗺️ AUTOMATION PATTERN LIBRARY

**Email workflows:**
- Auto-reply: \`gmail_trigger → ai_classify → condition → ai_transform(draft) → gmail(send)\`
- Support triage: \`gmail_trigger → ai_classify(urgency) → condition → [slack(urgent) / notion(log)]\`
- Invoice parser: \`gmail_trigger → filter(subject has "invoice") → ai_extract(amount,vendor,date) → google_sheets(append)\`

**Scheduled workflows:**
- Daily digest: \`cron_trigger(0 8 * * *) → http_request(fetch data) → ai_transform(format) → slack(#team)\`
- Price monitor: \`cron_trigger(0 * * * *) → web_scraper → condition(price < threshold) → sendgrid(alert)\`
- Weekly report: \`cron_trigger(0 9 * * 1) → google_sheets(read) → ai_transform(summarize) → gmail(send)\`

**Webhook / API workflows:**
- Lead enrichment: \`webhook → http_request(clearbit enrich) → hubspot(create contact) → slack(#sales notify)\`
- Form → CRM: \`form_trigger → ai_classify(lead score) → hubspot(create deal) → sendgrid(confirm email)\`
- GitHub events: \`github_trigger → ai_transform(summarize PR diff) → slack(#engineering)\`

**AI Agent workflows:**
- Chat assistant: \`chat_trigger → ai_agent ← agent_anthropic[model]\`
- Email + calendar agent: \`chat_trigger → ai_agent ← agent_anthropic[model], ← agent_integration_gmail[integration], ← agent_integration_google_calendar[integration]\`
- Full productivity agent: \`chat_trigger → ai_agent ← agent_anthropic[model], ← agent_integration_gmail[integration], ← agent_integration_google_drive[integration], ← agent_integration_google_sheets[integration], ← agent_integration_notion[integration]\`
- Dev agent: \`chat_trigger → ai_agent ← agent_anthropic[model], ← agent_integration_github[integration], ← agent_integration_linear[integration], ← agent_integration_slack[integration]\`
- RAG agent (with memory): add \`agent_memory_supabase\` or \`agent_memory_pinecone\` node → ai_agent targetHandle:"memory"

**Enriched linear patterns (add these steps even if user didn't ask):**
- After any trigger: consider a \`filter\` node if not all events should continue
- Before \`condition\`: add \`ai_classify\` to produce a clean category field
- Before any template: add \`ai_extract\` to pull structured fields from raw text
- After critical actions (payment, CRM write): add \`success_failed\` for error handling

---

## ❌ FORBIDDEN PATTERNS (instant fail)

| Wrong | Right |
|-------|-------|
| \`manual\` trigger in an AI agent workflow | \`chat_trigger\` |
| \`manual\` trigger when user didn't say "manually" | pick the correct trigger |
| \`google_calendar_trigger\` as an integration tool | \`agent_integration_google_calendar\` |
| \`gmail_trigger\` to SEND email | \`gmail\` action node |
| ai_agent → gmail (downstream linear) | gmail → ai_agent targetHandle:"integration" |
| Two separate trigger chains in one response | One connected graph |
| Orphaned node with no edges | Connect every node |
| Edge reversed: source=ai_agent, target=integration | source=integration, target=ai_agent |
| Trigger node as source with targetHandle set | Triggers only connect to main input, never hub handles |
| Empty config fields | Real values always |
| Generic labels "Node 1", "Step A" | "Parse Invoice", "Post to #sales" |

---

## When to call create_workflow vs plain text
- User asks to build/automate/create → call create_workflow with full nodes+edges
- User asks a question or needs clarification → plain text only, NO tool call
- Empty canvas answer (pure text response) → create_workflow with nodes:[] edges:[]`;

function buildSystemPrompt(canvasNodes = [], canvasEdges = []) {
  if (!canvasNodes?.length) return SYSTEM_PROMPT_BASE;

  const nodeList = canvasNodes
    .map(n => `  [${n.id}] backendType:${n.backendType} label:"${n.label}" type:${n.type} pos:(${n.x},${n.y})`)
    .join("\n");

  const edgeList = canvasEdges.length
    ? canvasEdges.map(e => {
        const th = e.targetHandle ? ` targetHandle:"${e.targetHandle}"` : "";
        const sh = e.sourceHandle ? ` sourceHandle:"${e.sourceHandle}"` : "";
        return `  ${e.source} → ${e.target}${sh}${th}`;
      }).join("\n")
    : "  (none yet)";

  const canvasSection = `\n\n## Current Canvas — ${canvasNodes.length} existing node${canvasNodes.length !== 1 ? "s" : ""}
### Nodes:
${nodeList}

### Existing edges:
${edgeList}

### Modify vs Create rules:
- User says "add", "extend", "also", "and then", "now", "next" → ADD new nodes to the existing workflow. Reuse exact existing node IDs in your output edges.
- User says "new workflow", "start over", "replace", "completely different" → Replace everything with a fresh workflow.
- Default when canvas has nodes: EXTEND, not replace.
- When extending: include ALL existing nodes in your output (same IDs, same positions, same configs) PLUS the new ones.
- Never duplicate existing nodes. Never change IDs or positions of existing nodes.
- Preserve all existing edges AND add new ones for the new nodes.`;

  return SYSTEM_PROMPT_BASE + canvasSection;
}

// ── Anthropic tool definition ─────────────────────────────────────────────────
const WORKFLOW_TOOL = {
  name: "create_workflow",
  description: "Create a BlinkBox automation workflow with fully configured nodes. REQUIREMENT: every node config must be production-ready — real field values, real prompts, real channel names, real cron expressions. No placeholders, no empty strings (except credentialId which users fill in). A workflow that needs manual editing before running is a failure.",
  input_schema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "2–3 sentence explanation: what triggers it, what it does, what the output is.",
      },
      nodes: {
        type: "array",
        description: "Workflow nodes. Every config must have meaningful values filled in. Labels must describe what the node does (e.g. 'Filter Spam Emails', not 'Filter Node').",
        items: {
          type: "object",
          properties: {
            id:          { type: "string", description: "Unique ID like n1, n2, n3" },
            backendType: { type: "string", description: "Node backendType from the reference" },
            label:       { type: "string", description: "Human-readable node label" },
            nodeType:    { type: "string", enum: ["trigger", "action"] },
            x:           { type: "number" },
            y:           { type: "number" },
            config:      { type: "object", description: "Fully populated config. Use the node reference to fill real values." },
          },
          required: ["id", "backendType", "label", "nodeType", "x", "y", "config"],
          additionalProperties: false,
        },
      },
      edges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id:           { type: "string" },
            source:       { type: "string" },
            target:       { type: "string" },
            sourceHandle: { type: "string", description: "Only for condition nodes: 'true' or 'false'" },
            targetHandle: { type: "string", description: "For ai_agent inputs only: 'chat_model', 'integration', 'tools', or 'memory'. Omit for all other nodes." },
          },
          required: ["id", "source", "target"],
          additionalProperties: false,
        },
      },
    },
    required: ["text", "nodes", "edges"],
    additionalProperties: false,
  },
};

// ── Convert tool output → ReactFlow canvas format ─────────────────────────────
function toolToCanvas({ nodes = [], edges = [] }) {
  if (!nodes.length) return null;

  const TRIGGER_TYPES = new Set([
    "manual","webhook","cron_trigger","rss_trigger","imap_trigger","gmail_trigger",
    "slack_trigger","discord_trigger","telegram_trigger","github_trigger",
    "shopify_trigger","linear_trigger","notion_trigger","airtable_trigger",
    "stripe_trigger","hubspot_trigger","youtube_trigger","reddit_trigger",
    "google_calendar_trigger","form_trigger","chat_trigger","db_trigger","error_trigger",
  ]);

  // ── Step 0: Sanitize — remove spurious manual nodes in AI agent workflows ──
  const hasAiAgent    = nodes.some(n => n.backendType === "ai_agent");
  const hasRealTrigger = nodes.some(n => n.backendType && n.backendType !== "manual" && TRIGGER_TYPES.has(n.backendType));
  const sanitizedNodes = nodes.filter(n => {
    if (n.backendType === "manual" && hasAiAgent) return false;        // manual trigger never in AI agent workflows
    if (n.backendType === "manual" && hasRealTrigger) return false;    // strip duplicate manual when real trigger exists
    return true;
  });
  // If no trigger left after sanitizing, inject a chat_trigger for ai_agent workflows
  const hasTriggerAfterSanitize = sanitizedNodes.some(n => TRIGGER_TYPES.has(n.backendType || "") || n.nodeType === "trigger");
  if (!hasTriggerAfterSanitize && hasAiAgent) {
    sanitizedNodes.unshift({ id: "n_trigger", backendType: "chat_trigger", label: "On Chat Message", nodeType: "trigger", x: 80, y: 300, config: {} });
  }

  // ── Step 1: Build canvas nodes ────────────────────────────────────────────
  const canvasNodes = sanitizedNodes.map((n, i) => {
    const bt      = n.backendType || "manual";
    const isTrig  = TRIGGER_TYPES.has(bt) || n.nodeType === "trigger";
    return {
      id:       String(n.id || `n${i + 1}`),
      type:     "custom",
      position: { x: Number(n.x) || 400, y: Number(n.y) || (80 + i * 220) },
      data: {
        label:       n.label || bt,
        backendType: bt,
        type:        isTrig ? "trigger" : "action",
        config:      n.config || {},
      },
    };
  });

  const nodeIds = new Set(canvasNodes.map(n => n.id));

  const AI_AGENT_HANDLES = new Set(["chat_model", "integration", "tools", "memory"]);
  const HUB_TYPES = new Set(["agent_anthropic","agent_openai","agent_gemini","agent_groq",
    "agent_integration_gmail","agent_integration_google_sheets","agent_integration_google_calendar",
    "agent_integration_google_drive","agent_integration_github","agent_integration_slack",
    "agent_integration_notion","agent_integration_discord","agent_integration_stripe",
    "agent_integration_hubspot","agent_integration_jira","agent_integration_linear",
    "agent_integration_airtable","agent_tool"]);

  // ── Step 2: Build and validate edges ─────────────────────────────────────
  let canvasEdges = edges
    .map((e, i) => {
      const raw = {
        id:           String(e.id || `e${i + 1}`),
        source:       String(e.source || ""),
        target:       String(e.target || ""),
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
        type:         "configurable",
        data:         { conditionPath: "" },
        style:        {},
      };
      // Auto-fix reversed ai_agent hub edges: if source is ai_agent and targetHandle is a hub handle,
      // swap source/target so the hub node feeds INTO the ai_agent
      if (raw.targetHandle && AI_AGENT_HANDLES.has(raw.targetHandle)) {
        const srcNode = canvasNodes.find(n => n.id === raw.source);
        const tgtNode = canvasNodes.find(n => n.id === raw.target);
        if (srcNode?.data?.backendType === "ai_agent" && tgtNode && HUB_TYPES.has(tgtNode.data?.backendType)) {
          [raw.source, raw.target] = [raw.target, raw.source];
        }
      }
      return raw;
    })
    .filter(e => {
      if (!e.source || !e.target) return false;
      if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return false;
      const sourceNode = canvasNodes.find(n => n.id === e.source);
      const targetNode = canvasNodes.find(n => n.id === e.target);
      // Strip edges where target is a trigger node (triggers are always sources, never targets)
      if (targetNode?.data?.type === "trigger") return false;
      // Strip hub-handle edges where the source is a trigger — triggers cannot plug into ai_agent hub slots
      if (e.targetHandle && AI_AGENT_HANDLES.has(e.targetHandle) && sourceNode?.data?.type === "trigger") return false;
      return true;
    });

  // ── Step 3: Auto-chain if no valid edges produced ─────────────────────────
  if (!canvasEdges.length && canvasNodes.length > 1) {
    canvasEdges = canvasNodes.slice(0, -1).map((n, i) => ({
      id: `e${i + 1}`, source: n.id, target: canvasNodes[i + 1].id,
      sourceHandle: null, type: "configurable", data: { conditionPath: "" }, style: {},
    }));
  }

  // ── Step 4: Remove orphaned nodes (unreachable from trigger) ─────────────
  // Hub-connected nodes (targetHandle set) are already properly connected — don't re-chain them.
  const hubConnectedTargets = new Set(canvasEdges.filter(e => e.targetHandle).map(e => e.source));
  const triggerNode = canvasNodes.find(n => n.data.type === "trigger") || canvasNodes[0];
  if (triggerNode && canvasNodes.length > 1) {
    const reachable = new Set([triggerNode.id]);
    // Pre-seed hub-connected nodes as reachable (they plug into a hub, not the main chain)
    for (const id of hubConnectedTargets) reachable.add(id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of canvasEdges) {
        if (reachable.has(e.source) && !reachable.has(e.target)) {
          reachable.add(e.target);
          changed = true;
        }
      }
    }
    // Only keep reachable nodes; remove edges to removed nodes
    const removed = canvasNodes.filter(n => !reachable.has(n.id));
    if (removed.length) {
      const keepIds = reachable;
      canvasEdges = canvasEdges.filter(e => keepIds.has(e.source) && keepIds.has(e.target));
      // Re-chain truly orphaned (non-hub) action nodes linearly
      const lastReachable = [...reachable].filter(id => !hubConnectedTargets.has(id)).pop() || [...reachable].pop();
      removed.forEach((orphan, oi) => {
        const prevId = oi === 0 ? lastReachable : removed[oi - 1].id;
        canvasEdges.push({
          id: `e_fix_${oi}`, source: prevId, target: orphan.id,
          sourceHandle: null, targetHandle: null, type: "configurable", data: { conditionPath: "" }, style: {},
        });
        reachable.add(orphan.id);
      });
    }
  }

  // ── Step 5: Ensure trigger is first node, promote if needed ──────────────
  const trigIdx = canvasNodes.findIndex(n => n.data.type === "trigger");
  if (trigIdx > 0) {
    const [trig] = canvasNodes.splice(trigIdx, 1);
    canvasNodes.unshift(trig);
  }

  // ── Step 6: Dedup positions ───────────────────────────────────────────────
  const positionsSeen = new Set();
  canvasNodes.forEach(n => {
    const key = `${n.position.x},${n.position.y}`;
    if (positionsSeen.has(key)) n.position.x += 220;
    positionsSeen.add(`${n.position.x},${n.position.y}`);
  });

  return { nodes: canvasNodes, edges: canvasEdges };
}

// ── Normalize plain-JSON response (Groq / Gemini) ─────────────────────────────
function normalizeFlow(parsed) {
  const src   = parsed.flow || parsed.workflow || parsed;
  const nodes = src.nodes || parsed.nodes || [];
  const edges = src.edges || parsed.edges || [];
  if (!nodes.length) return null;

  const normNodes = nodes.map((n, i) => {
    const bt      = n.backendType || n.data?.backendType || n.type || "manual";
    const cleanBt = bt === "custom" ? "manual" : bt;
    const isTrig  = TRIGGERS.has(cleanBt) || n.data?.type === "trigger";
    const pos     = n.position || {};
    return {
      id:       String(n.id || `n${i + 1}`),
      type:     "custom",
      position: { x: Number(pos.x) || 300, y: Number(pos.y) || 100 + i * 220 },
      data: {
        label:       n.label || n.data?.label || n.name || cleanBt,
        backendType: cleanBt,
        type:        isTrig ? "trigger" : "action",
        config:      n.config || n.data?.config || {},
      },
    };
  });

  let normEdges = edges.map((e, i) => ({
    id:           String(e.id || `e${i + 1}`),
    source:       String(e.source || e.from || ""),
    target:       String(e.target || e.to   || ""),
    sourceHandle: e.sourceHandle || null,
    targetHandle: e.targetHandle || null,
    type:         "configurable",
    data:         { conditionPath: "" },
    style:        {},
  })).filter(e => e.source && e.target);

  if (!normEdges.length && normNodes.length > 1) {
    normEdges = normNodes.slice(0, -1).map((n, i) => ({
      id: `e${i + 1}`, source: n.id, target: normNodes[i + 1].id,
      sourceHandle: null, type: "configurable", data: { conditionPath: "" }, style: {},
    }));
  }

  return { nodes: normNodes, edges: normEdges };
}

// ── Provider 1: BlinkBox webhook ──────────────────────────────────────────────
async function callBlinkBoxWebhook(webhookUrl, userText, history) {
  const res = await axios.post(
    webhookUrl,
    { prompt: userText, history },
    { timeout: 60_000, headers: { "Content-Type": "application/json" } },
  );
  const data = res.data;
  if (data?.text !== undefined) return data;
  if (data?.output) return data.output;
  return data;
}

// ── Provider 2: Anthropic Claude streaming ────────────────────────────────────
async function callAnthropicStream(apiKey, messages, canvasNodes, canvasEdges, res) {
  const client = new Anthropic({ apiKey });

  const rawHistory = messages.slice(0, -1);
  let history = rawHistory
    .filter(m => m.content || m.text)
    .map(m => ({
      role:    m.role === "user" ? "user" : "assistant",
      content: String(m.content || m.text || "").trim(),
    }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)    history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const stream = client.messages.stream({
      model:      ANTHROPIC_MODEL,
      max_tokens: 32000,
      system:     buildSystemPrompt(canvasNodes, canvasEdges),
      messages:    [...history, { role: "user", content: userText }],
      tools:       [WORKFLOW_TOOL],
      tool_choice: { type: "auto" },
    });

    const blockTypes  = {};
    const toolBuffers = {};

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const idx = event.index;
        const bt  = event.content_block.type;
        blockTypes[idx] = bt;
        if (bt === "tool_use") toolBuffers[idx] = "";
      }

      if (event.type === "content_block_delta") {
        const idx   = event.index;
        const delta = event.delta;
        if (delta.type === "thinking_delta") {
          sendEvent({ type: "thinking_delta", delta: delta.thinking });
        } else if (delta.type === "text_delta") {
          sendEvent({ type: "text_delta", delta: delta.text });
        } else if (delta.type === "input_json_delta") {
          if (toolBuffers[idx] !== undefined) toolBuffers[idx] += delta.partial_json;
        }
      }

      if (event.type === "content_block_stop") {
        const idx = event.index;
        if (blockTypes[idx] === "tool_use") {
          try {
            const input        = JSON.parse(toolBuffers[idx] || "{}");
            const { text, nodes, edges } = input;
            const flow         = nodes?.length ? toolToCanvas({ nodes, edges }) : null;
            sendEvent({ type: "flow", text: text || "", flow });
          } catch {
            // Malformed JSON — tool call failed silently
          }
          delete blockTypes[idx];
          delete toolBuffers[idx];
        }
      }
    }

    sendEvent({ type: "done" });
  } catch (err) {
    sendEvent({ type: "error", message: err.message || "Stream error" });
  } finally {
    res.end();
  }
}

// ── Provider 2b: Anthropic non-streaming (kept for internal fallback logic) ───
async function callAnthropic(apiKey, messages, canvasNodes = [], canvasEdges = []) {
  const client = new Anthropic({ apiKey });

  const rawHistory = messages.slice(0, -1);
  let history = rawHistory
    .filter(m => m.content || m.text)
    .map(m => ({
      role:    m.role === "user" ? "user" : "assistant",
      content: String(m.content || m.text || "").trim(),
    }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)    history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();

  const response = await client.messages.create({
    model:      ANTHROPIC_MODEL,
    max_tokens: 32000,
    system:     buildSystemPrompt(canvasNodes, canvasEdges),
    messages:    [...history, { role: "user", content: userText }],
    tools:       [WORKFLOW_TOOL],
    tool_choice: { type: "auto" },
  });

  const thinkingBlock = response.content.find(b => b.type === "thinking");
  const thinking      = thinkingBlock?.thinking || null;

  const toolUse = response.content.find(b => b.type === "tool_use");
  if (toolUse?.input) {
    const { text, nodes, edges } = toolUse.input;
    return {
      text:     text || "",
      thinking,
      flow:     nodes?.length ? toolToCanvas({ nodes, edges }) : null,
    };
  }

  const textBlock = response.content.find(b => b.type === "text");
  return { text: textBlock?.text || "", thinking, flow: null };
}

// ── Provider 3: Groq ──────────────────────────────────────────────────────────
async function callGroq(apiKey, model, payload) {
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) await sleep(attempt * 2000);
    try {
      const res = await axios.post(GROQ_URL, {
        model,
        messages:        payload,
        temperature:     0.2,
        max_tokens:      4096,
        response_format: { type: "json_object" },
      }, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        timeout: 28000,
      });
      return res.data.choices[0].message.content;
    } catch (err) {
      if (err.response?.status !== 429 || attempt === 2) throw err;
    }
  }
}

// ── Provider 4: Google Gemini ─────────────────────────────────────────────────
async function callGemini(apiKey, messages, canvasNodes = [], canvasEdges = []) {
  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: buildSystemPrompt(canvasNodes, canvasEdges),
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  });

  let history = messages.slice(0, -1)
    .filter(m => m.content || m.text)
    .map(m => ({
      role:  m.role === "user" ? "user" : "model",
      parts: [{ text: String(m.content || m.text || " ") }],
    }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)    history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  const chat   = model.startChat({ history });
  const result = await chat.sendMessage(userText);
  return result.response.text();
}

// ── Streaming route handler ───────────────────────────────────────────────────
export async function brianChatStream(req, res) {
  const { messages = [], canvasContext = {} } = req.body;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ message: "Empty messages." });
  }
  if (messages.length > 100) return res.status(400).json({ message: "Too many messages in history." });

  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();
  if (!userText) return res.status(400).json({ message: "Empty message." });
  if (userText.length > 8000) return res.status(400).json({ message: "Message too long (max 8000 characters)." });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey      = process.env.GROQ_API_KEY;
  const googleKey    = process.env.GOOGLE_AI_KEY;

  // Support both legacy array format and new {nodes, edges} object
  const canvasNodes = Array.isArray(canvasContext) ? canvasContext : (canvasContext?.nodes || []);
  const canvasEdges = Array.isArray(canvasContext) ? [] : (canvasContext?.edges || []);

  if (BRIAN_WEBHOOK_URL) {
    try {
      const history = messages.slice(0, -1).map(m => ({
        role:    m.role === "user" ? "user" : "assistant",
        content: m.content || m.text || "",
      }));
      const result = await callBlinkBoxWebhook(BRIAN_WEBHOOK_URL, userText, history);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.flushHeaders();
      const flow = result?.flow ? normalizeFlow(result) : null;
      res.write(`data: ${JSON.stringify({ type: "flow", text: result?.text || "", flow })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      return res.end();
    } catch (err) {
      console.warn("[Brian/stream] webhook failed:", err.message, "— falling back");
    }
  }

  if (!anthropicKey && !groqKey && !googleKey) {
    return res.status(503).json({ message: "Set ANTHROPIC_API_KEY in Railway to activate Brian." });
  }

  if (anthropicKey) {
    try {
      return await callAnthropicStream(anthropicKey, messages, canvasNodes, canvasEdges, res);
    } catch (err) {
      const s = err.status || err.response?.status;
      console.warn("[Brian/stream] Anthropic failed:", s, err.message);
      if (s === 401 || s === 403) {
        return res.status(503).json({ message: "ANTHROPIC_API_KEY is invalid." });
      }
      if (!groqKey && !googleKey) {
        return res.status(500).json({ message: "AI provider error. Please try again." });
      }
    }
  }

  // Groq / Gemini fallback — run non-streaming, emit single flow event via SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  const sendEvent = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  let history = messages.slice(0, -1)
    .filter(m => m.content || m.text)
    .map(m => ({
      role:    m.role === "user" ? "user" : "assistant",
      content: String(m.content || m.text || " ").trim(),
    }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)    history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  if (groqKey) {
    const payload = [
      { role: "system", content: buildSystemPrompt(canvasNodes, canvasEdges) },
      ...history,
      { role: "user", content: userText },
    ];
    try {
      const raw     = await callGroq(groqKey, GROQ_MODEL, payload)
                        .catch(() => callGroq(groqKey, GROQ_FAST, payload));
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch {
        sendEvent({ type: "text_delta", delta: raw });
        sendEvent({ type: "done" });
        return res.end();
      }
      sendEvent({ type: "flow", text: parsed.text || "", flow: normalizeFlow(parsed) });
      sendEvent({ type: "done" });
      return res.end();
    } catch (err) {
      console.warn("[Brian/stream] Groq failed:", err.response?.status, err.message);
      if (!googleKey) {
        sendEvent({ type: "error", message: "AI provider error. Please try again." });
        return res.end();
      }
    }
  }

  if (googleKey) {
    try {
      const raw     = await callGemini(googleKey, messages, canvasNodes);
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch {
        sendEvent({ type: "text_delta", delta: raw });
        sendEvent({ type: "done" });
        return res.end();
      }
      sendEvent({ type: "flow", text: parsed.text || "", flow: normalizeFlow(parsed) });
      sendEvent({ type: "done" });
      return res.end();
    } catch (err) {
      console.error("[Brian/stream] all providers failed:", err.message);
      sendEvent({ type: "error", message: "AI provider error. Please try again." });
      return res.end();
    }
  }
}

// ── Non-streaming route handler (kept for compatibility) ──────────────────────
export async function brianChat(req, res) {
  const { messages = [], canvasContext = [] } = req.body;
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ message: "Empty messages." });
  if (messages.length > 100) return res.status(400).json({ message: "Too many messages in history." });

  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();
  if (!userText) return res.status(400).json({ message: "Empty message." });
  if (userText.length > 8000) return res.status(400).json({ message: "Message too long (max 8000 characters)." });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey      = process.env.GROQ_API_KEY;
  const googleKey    = process.env.GOOGLE_AI_KEY;
  const canvasNodes  = Array.isArray(canvasContext) ? canvasContext : [];

  if (BRIAN_WEBHOOK_URL) {
    try {
      const history = messages.slice(0, -1).map(m => ({
        role:    m.role === "user" ? "user" : "assistant",
        content: m.content || m.text || "",
      }));
      const result = await callBlinkBoxWebhook(BRIAN_WEBHOOK_URL, userText, history);
      if (result?.flow) return res.json({ text: result.text || "", flow: normalizeFlow(result) });
      return res.json({ text: result?.text || String(result || ""), flow: null });
    } catch (err) {
      console.warn("[Brian] webhook failed:", err.message, "— falling back");
    }
  }

  if (!anthropicKey && !groqKey && !googleKey) {
    return res.status(503).json({ message: "Set ANTHROPIC_API_KEY in Railway to activate Brian." });
  }

  if (anthropicKey) {
    try {
      return res.json(await callAnthropic(anthropicKey, messages, canvasNodes));
    } catch (err) {
      const status = err.status || err.response?.status;
      console.warn("[Brian] Anthropic failed:", status, err.message);
      if (status === 401 || status === 403) return res.status(503).json({ message: "ANTHROPIC_API_KEY is invalid." });
      if (!groqKey && !googleKey) return res.status(500).json({ message: "AI provider error. Please try again." });
    }
  }

  let history = messages.slice(0, -1)
    .filter(m => m.content || m.text)
    .map(m => ({
      role:    m.role === "user" ? "user" : "assistant",
      content: String(m.content || m.text || " ").trim(),
    }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)    history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  if (groqKey) {
    const payload = [
      { role: "system", content: buildSystemPrompt(canvasNodes, canvasEdges) },
      ...history,
      { role: "user", content: userText },
    ];
    try {
      const raw     = await callGroq(groqKey, GROQ_MODEL, payload)
                        .catch(() => callGroq(groqKey, GROQ_FAST, payload));
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch { return res.json({ text: raw, flow: null }); }
      return res.json({ text: parsed.text || "", flow: normalizeFlow(parsed) });
    } catch (err) {
      console.warn("[Brian] Groq failed:", err.response?.status, err.message);
      if (!googleKey) return res.status(500).json({ message: "AI provider error. Please try again." });
    }
  }

  if (googleKey) {
    try {
      const raw     = await callGemini(googleKey, messages, canvasNodes);
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch { return res.json({ text: raw, flow: null }); }
      return res.json({ text: parsed.text || "", flow: normalizeFlow(parsed) });
    } catch (err) {
      console.error("[Brian] all providers failed:", err.message);
      return res.status(500).json({ message: "AI provider error. Please try again." });
    }
  }
}
