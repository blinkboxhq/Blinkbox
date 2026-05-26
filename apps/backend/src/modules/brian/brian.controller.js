import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NODE_KB, buildNodeRef } from "./brian.nodes.js";
import { normalizeFlow, toolToCanvas } from "./brian.repair.js";
import { BRIAN_ANTHROPIC_MODEL, BRIAN_CHEAP_ANTHROPIC_MODEL } from "./brian.registry.js";
import { buildBrianPreflightQuestions } from "./brian.preflight.js";
import Credential from "../../models/credential.model.js";
import {
  ANTHROPIC_API_KEY,
  GROQ_API_KEY,
  GOOGLE_AI_KEY,
  BRIAN_WEBHOOK_URL as _BRIAN_WEBHOOK_URL,
} from "../../config/env.js";

const ANTHROPIC_MODEL   = BRIAN_ANTHROPIC_MODEL;
const GROQ_URL          = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL        = "llama-3.3-70b-versatile";
const GROQ_FAST         = "llama-3.1-8b-instant";
const BRIAN_WEBHOOK_URL = _BRIAN_WEBHOOK_URL || "";
const sleep             = ms => new Promise(r => setTimeout(r, ms));

const TRIGGERS = new Set([
  "manual","webhook","cron_trigger","rss_trigger","imap_trigger","gmail_trigger",
  "slack_trigger","discord_trigger","telegram_trigger","github_trigger",
  "shopify_trigger","linear_trigger","notion_trigger","airtable_trigger",
  "stripe_trigger","hubspot_trigger","youtube_trigger","reddit_trigger",
  "google_calendar_trigger","price_alert_trigger","chat_trigger","form_trigger",
  "db_trigger","error_trigger",
]);

const NODE_REF = buildNodeRef();

// ── Sanitize untrusted strings before prompt injection ────────────────────────
const safeStr = (s, max = 80) =>
  String(s || "").replace(/[`\n\r]/g, " ").slice(0, max);

// ── Credential context builder ────────────────────────────────────────────────
async function buildCredentialContext(userId) {
  try {
    const creds = await Credential.find({ workspaceId: userId })
      .select("name type provider")
      .lean();
    if (!creds.length) return "";
    const lines = creds
      .map(c => `  - "${safeStr(c.name, 50)}" (${c.provider || c.type || "api_key"})`)
      .join("\n");
    return `\n\n## User's Connected Credentials\nAlready authenticated — available immediately:\n${lines}\nMention matching credentials in your explanation, but keep generated node config credentialId as "" so the builder UI can assign the selected credential at apply time.`;
  } catch {
    return "";
  }
}

const SYSTEM_PROMPT_BASE = `You are Brian — the senior AI workflow architect inside Blinkbox, a visual automation platform (like n8n/Zapier but smarter).

Before deciding what to do, run this checklist silently:
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

**R5 — AI Agent workflows: include ONLY what was explicitly requested.**
For agent workflows, add ONLY the integrations/tools the user named. Do NOT add extra services (Perplexity, Notion, Slack, etc.) unless the user explicitly mentioned them. Quality over quantity.

**R7 — Trigger backendTypes are NOT action nodes.**
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

The AI Agent hub is the GRAVITATIONAL CENTER. Every satellite node points INTO it.

\`\`\`
DESIGNER LAYOUT — golden rule: every AI Agent satellite node lives BELOW the AI Agent hub.

[trigger] ──────────→ [  ai_agent hub  ]
x:80, y:300            x:400, y:300
                         ↓ slots point into hub from below
              [model]       [memory]
              x:260,y:560   x:540,y:560

              [integ_1]  [integ_2]  [integ_3]  [integ_4]
              spread evenly below hub at y:780
\`\`\`

ZONE RULES:
- trigger     → always x:80,  y:300 (left zone)
- ai_agent    → always x:400, y:300 (center)
- model node  → always x:260, y:560 (below-left zone)
- memory node → always x:540, y:560 (below-right zone)
- integrations → always y:780 (bottom zone), spread by count (see table below)
- NEVER place agent model/memory/integration/tool satellites above the ai_agent.

**WIRING CHEAT SHEET — memorize source/target direction:**

EDGE RULES (source → target, targetHandle):
- chat_trigger   → ai_agent,              no targetHandle   (trigger, main flow)
- agent_model    → ai_agent,  targetHandle: llm      (model slot; legacy chat_model is accepted but do not emit it)
- agent_memory   → ai_agent,  targetHandle: memory          (memory slot)
- agent_integration → ai_agent, targetHandle: integration   (integration slot)
- agent_tool     → ai_agent,  targetHandle: tools           (tool slot)

**NEVER reverse these.** ai_agent is always the TARGET for satellite nodes, never the SOURCE.

**Example edges array for a 3-integration agent:**
\`\`\`json
[
  { "id":"e1", "source":"n1", "target":"n2" },
  { "id":"e2", "source":"n3", "target":"n2", "targetHandle":"llm" },
  { "id":"e3", "source":"n4", "target":"n2", "targetHandle":"integration" },
  { "id":"e4", "source":"n5", "target":"n2", "targetHandle":"integration" },
  { "id":"e5", "source":"n6", "target":"n2", "targetHandle":"integration" }
]
\`\`\`
*(n1=chat_trigger, n2=ai_agent, n3=model, n4-6=integrations)*

**Agent model nodes** — pick exactly ONE, default to Anthropic:
- \`agent_anthropic\` → \`{ model:"claude-sonnet-4-6", credentialId:"" }\` normally; if the user asks for cheap/cheaper/lowest-cost Claude, use \`{ model:"${BRIAN_CHEAP_ANTHROPIC_MODEL}", credentialId:"" }\`
- \`agent_openai\`    → \`{ model:"gpt-4o", credentialId:"" }\`
- \`agent_groq\`      → \`{ model:"llama-3.3-70b-versatile", credentialId:"" }\`
- \`agent_gemini\`    → \`{ model:"gemini-2.0-flash", credentialId:"" }\`

**Agent integration nodes** — one per service, each needs a credential:
Each: \`{ credentialId:"", alias:"short_name" }\`

| Service | backendType | alias |
|---------|-------------|-------|
| Gmail | \`agent_integration_gmail\` | "gmail" |
| Google Sheets | \`agent_integration_google_sheets\` | "sheets" |
| Google Calendar | \`agent_integration_google_calendar\` | "calendar" |
| Google Drive | \`agent_integration_google_drive\` | "drive" |
| GitHub | \`agent_integration_github\` | "github" |
| Slack | \`agent_integration_slack\` | "slack" |
| Notion | \`agent_integration_notion\` | "notion" |
| Linear | \`agent_integration_linear\` | "linear" |
| HubSpot | \`agent_integration_hubspot\` | "hubspot" |
| Jira | \`agent_integration_jira\` | "jira" |
| Airtable | \`agent_integration_airtable\` | "airtable" |
| Discord | \`agent_integration_discord\` | "discord" |
| Telegram | \`agent_integration_telegram\` | "telegram" |
| Outlook | \`agent_integration_outlook\` | "outlook" |
| Asana | \`agent_integration_asana\` | "asana" |
| Shopify | \`agent_integration_shopify\` | "shopify" |
| ClickUp | \`agent_integration_clickup\` | "clickup" |
| Twilio | \`agent_integration_twilio\` | "twilio" |
| MongoDB | \`agent_integration_mongodb\` | "mongodb" |
| PostgreSQL | \`agent_integration_postgres\` | "postgres" |
| Redis | \`agent_integration_redis\` | "redis" |

**Agent memory nodes** (for RAG):
- Default RAG memory: \`agent_memory_pinecone\` → \`{ credentialId:"", indexName:"blinkbox-rag" }\` targetHandle:"memory"
- Only use \`agent_memory_supabase\`, \`agent_memory_postgres\`, or \`agent_memory_redis\` if the user explicitly asks for that provider.

**AI Agent system prompt** — always write a real, specific one:
\`{ systemPrompt: "You are a [role] assistant with access to [services]. When the user asks about X, use [alias] to [action]. Format responses as [style]." }\`

**credentialId rule**: Always \`""\` — the user fills it in via the credential picker after you generate the workflow.

---

## 📐 LAYOUT COORDINATES

### AI Agent Hub layout (Pattern 4)

| Node role | x | y | Notes |
|-----------|---|---|-------|
| chat_trigger | 80 | 300 | Always left of hub |
| ai_agent | 400 | 300 | Center — never move |
| Model (agent_anthropic etc) | 640 | 60 | Top-RIGHT — never x:400 |
| Memory (agent_memory_*) | 160 | 60 | Top-LEFT |
| 1 integration | 400 | 560 | Centered below hub |
| 2 integrations | 220, 580 | 560 | Symmetric |
| 3 integrations | 80, 400, 720 | 560 | Evenly spaced |
| 4 integrations | 60, 280, 500, 720 | 560 | Even |
| 5 integrations | 60, 230, 400, 570, 740 | 560 | Even |

### Linear chain layout (Pattern 1)

| Step | x | y |
|------|---|---|
| Step 1 (trigger) | 400 | 80 |
| Step 2 | 400 | 300 |
| Step 3 | 400 | 520 |
| Step 4 | 400 | 740 |

### Condition branch layout (Pattern 2)

| Node | x | y |
|------|---|---|
| Trigger | 400 | 80 |
| Condition | 400 | 300 |
| True path | 680 | 520 |
| False path | 120 | 520 |

NEVER place two nodes within 100px of each other (x AND y both similar). Minimum gap: 180px horizontal, 200px vertical.

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
- RAG agent (with memory): add \`agent_memory_pinecone\` by default → ai_agent targetHandle:"memory"; only use Supabase/Postgres/Redis memory when named.

**Enriched linear patterns (add these steps even if user didn't ask):**
- After any trigger: consider a \`filter\` node if not all events should continue
- Before \`condition\`: add \`ai_classify\` to produce a clean category field
- Before any template: add \`ai_extract\` to pull structured fields from raw text
- After critical actions (payment, CRM write): add \`success_failed\` for error handling

---

## 🔍 PRE-SUBMIT WIRING CHECKLIST (AI Agent workflows — MANDATORY)

Before calling create_workflow, run this count silently:

1. Count every agent_model node you added (agent_anthropic, agent_openai, agent_groq, agent_gemini)
2. Count every agent_memory node you added
3. Count every agent_integration node you added

Then verify your edges array contains:
- One edge per model node with targetHandle:"llm" and target = ai_agent id
- One edge per memory node with targetHandle:"memory" and target = ai_agent id
- One edge per integration node with targetHandle:"integration" and target = ai_agent id

If any edge is missing → ADD IT NOW before submitting. A model node with no edge = broken workflow.

ALSO verify positions: model must be below the hub at x:260 y:560, memory below the hub at x:540 y:560, integrations at y:780. Never place an AI-agent satellite above the hub.

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
| Trigger node as source with targetHandle set | Triggers connect to ai_agent with NO targetHandle |
| model node with targetHandle:"integration" | model uses targetHandle:"llm" only |
| integration node with targetHandle:"llm" or "chat_model" | integration uses targetHandle:"integration" only |
| memory node with targetHandle:"integration" | memory uses targetHandle:"memory" only |
| Missing credentialId on model/integration nodes | Always include credentialId:"" in config |
| Empty config fields | Real values always |
| Generic labels "Node 1", "Step A" | "Parse Invoice", "Post to #sales" |

---

## 🎯 DECISION PROTOCOL — what to call for each request

Run this before every response:

**KNOW the trigger type?** (schedule/webhook/email/chat/etc.) → ✓ or ✗
**KNOW the service(s)?** (Slack, Gmail, Notion, etc.) → ✓ or ✗
**KNOW the goal clearly?** (what action, what output) → ✓ or ✗

All ✓ → call **create_workflow** immediately. Don't waste a turn asking.
Any ✗ → call **ask_user** with targeted questions and 3–5 option chips each.
AI agent request → ask the 5-point agent build brief first: goal, entrypoint, model/cost, memory, credential/config readiness.
User already answered ask_user → call **create_workflow** RIGHT NOW. Never ask again.
Pure explanation / how-to question → plain text only, no tool call.

**Ask when genuinely ambiguous:**
- "notify me when something happens" — trigger unclear
- "automate my business" — too vague
- "build me an AI assistant" — purpose/tools unclear
- "help me with emails" — unclear whether trigger, action, or both

**Build directly (don't ask):**
- "every morning at 8am, email me HackerNews top posts" → cron+http+gmail, build it
- "when a Stripe payment fails, send me a Slack DM" → stripe_trigger+slack, build it
- "sync Gmail leads to HubSpot" → gmail_trigger+hubspot, build it
- Any message after you already called ask_user → ALWAYS build now, no more questions

**Empty text response** → create_workflow with nodes:[] edges:[]`;

function buildSystemPrompt(canvasNodes = [], canvasEdges = [], credContext = "") {
  let base = SYSTEM_PROMPT_BASE;
  if (credContext) base += credContext;
  if (!canvasNodes?.length) return base;

  const nodeList = canvasNodes
    .map(n => `  [${safeStr(n.id, 20)}] backendType:${safeStr(n.backendType, 40)} label:"${safeStr(n.label)}" type:${safeStr(n.type, 10)} pos:(${Number(n.x)||0},${Number(n.y)||0})`)
    .join("\n");

  const edgeList = canvasEdges.length
    ? canvasEdges.map(e => {
        const th = e.targetHandle ? ` targetHandle:"${safeStr(e.targetHandle, 20)}"` : "";
        const sh = e.sourceHandle ? ` sourceHandle:"${safeStr(e.sourceHandle, 20)}"` : "";
        return `  ${safeStr(e.source, 20)} → ${safeStr(e.target, 20)}${sh}${th}`;
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

  return base + canvasSection;
}

// ── Anthropic tool: create_workflow ───────────────────────────────────────────
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
            targetHandle: { type: "string", description: "For ai_agent inputs only: 'llm', 'integration', 'tools', or 'memory'. Omit for all other nodes. Legacy 'chat_model' is accepted but do not emit it." },
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

// ── Anthropic tool: ask_user ──────────────────────────────────────────────────
const ASK_USER_TOOL = {
  name: "ask_user",
  description: "Ask targeted clarifying questions when the request is genuinely ambiguous or when building an AI agent. AI-agent requests should use a 5-point build brief: goal, entrypoint, model/cost, memory, and credential/config readiness. Each question must have 3–5 clickable option chips. Call this ONLY ONCE per conversation — after the user answers, always call create_workflow immediately. Never ask follow-up questions.",
  input_schema: {
    type: "object",
    properties: {
      intro: {
        type: "string",
        description: "One sentence acknowledging the request and explaining you need one quick detail.",
      },
      questions: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            id:       { type: "string", description: "Short id: 'trigger', 'service', 'scope', etc." },
            question: { type: "string", description: "The question text shown to the user." },
            options: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  label: { type: "string", description: "Display label for the chip button" },
                  value: { type: "string", description: "Machine value sent back" },
                  hint:  { type: "string", description: "Optional 6-word hint shown under the chip" },
                },
                required: ["label", "value"],
                additionalProperties: false,
              },
            },
          },
          required: ["id", "question", "options"],
          additionalProperties: false,
        },
      },
    },
    required: ["intro", "questions"],
    additionalProperties: false,
  },
};

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
async function callAnthropicStream(apiKey, messages, canvasNodes, canvasEdges, credContext, res) {
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

  const ac      = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 90_000);

  try {
    const stream = client.messages.stream({
      model:       ANTHROPIC_MODEL,
      max_tokens:  32000,
      system:      buildSystemPrompt(canvasNodes, canvasEdges, credContext),
      messages:    [...history, { role: "user", content: userText }],
      tools:       [WORKFLOW_TOOL, ASK_USER_TOOL],
      tool_choice: { type: "auto" },
    }, { signal: ac.signal });

    const blockTypes  = {};
    const toolBuffers = {};
    const toolNames   = {};

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const idx = event.index;
        const bt  = event.content_block.type;
        blockTypes[idx] = bt;
        if (bt === "tool_use") {
          toolBuffers[idx] = "";
          toolNames[idx]   = event.content_block.name;
        }
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
            const input    = JSON.parse(toolBuffers[idx] || "{}");
            const toolName = toolNames[idx];

            if (toolName === "ask_user") {
              sendEvent({ type: "questions", intro: input.intro || "", questions: input.questions || [] });
            } else {
              const { text, nodes, edges } = input;
              const flow = nodes?.length ? toolToCanvas({ nodes, edges }) : null;
              sendEvent({ type: "flow", text: text || "", flow });
            }
          } catch {
            // Malformed JSON — silent
          }
          delete blockTypes[idx];
          delete toolBuffers[idx];
          delete toolNames[idx];
        }
      }
    }

    sendEvent({ type: "done" });
  } catch (err) {
    if (err.name === "AbortError") {
      sendEvent({ type: "error", message: "Request timed out. Please try again." });
    } else {
      sendEvent({ type: "error", message: err.message || "Stream error" });
    }
  } finally {
    clearTimeout(timeout);
    res.end();
  }
}

// ── Provider 2b: Anthropic non-streaming ─────────────────────────────────────
async function callAnthropic(apiKey, messages, canvasNodes = [], canvasEdges = [], credContext = "") {
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
    model:       ANTHROPIC_MODEL,
    max_tokens:  32000,
    system:      buildSystemPrompt(canvasNodes, canvasEdges, credContext),
    messages:    [...history, { role: "user", content: userText }],
    tools:       [WORKFLOW_TOOL, ASK_USER_TOOL],
    tool_choice: { type: "auto" },
  });

  const thinkingBlock = response.content.find(b => b.type === "thinking");
  const thinking      = thinkingBlock?.thinking || null;

  const toolUse = response.content.find(b => b.type === "tool_use");
  if (toolUse?.input) {
    if (toolUse.name === "ask_user") {
      return { text: toolUse.input.intro || "", thinking, questions: toolUse.input.questions || [], flow: null };
    }
    const { text, nodes, edges } = toolUse.input;
    return { text: text || "", thinking, flow: nodes?.length ? toolToCanvas({ nodes, edges }) : null };
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
async function callGemini(apiKey, messages, canvasNodes = [], canvasEdges = [], credContext = "") {
  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: buildSystemPrompt(canvasNodes, canvasEdges, credContext),
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

// ── Validate individual messages ──────────────────────────────────────────────
function validateMessages(messages) {
  for (const m of messages) {
    if (!m || typeof m !== "object") return "Invalid message format.";
    if (!["user", "assistant"].includes(m.role)) return "Invalid message role.";
    const content = String(m.content || m.text || "");
    if (content.length > 6000) return "A message in history is too long.";
  }
  return null;
}

// ── Streaming route handler ───────────────────────────────────────────────────
export async function brianChatStream(req, res) {
  const { messages = [], canvasContext = {} } = req.body;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ message: "Empty messages." });
  }
  if (messages.length > 100) return res.status(400).json({ message: "Too many messages in history." });

  const validationError = validateMessages(messages);
  if (validationError) return res.status(400).json({ message: validationError });

  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();
  if (!userText) return res.status(400).json({ message: "Empty message." });
  if (userText.length > 8000) return res.status(400).json({ message: "Message too long (max 8000 characters)." });

  const canvasNodes = Array.isArray(canvasContext) ? canvasContext : (canvasContext?.nodes || []);
  const canvasEdges = Array.isArray(canvasContext) ? [] : (canvasContext?.edges || []);

  const credContext = await buildCredentialContext(req.user.id);
  const preflight = buildBrianPreflightQuestions(messages, userText);
  if (preflight) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ type: "questions", ...preflight })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    return res.end();
  }

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

  if (!ANTHROPIC_API_KEY && !GROQ_API_KEY && !GOOGLE_AI_KEY) {
    return res.status(503).json({ message: "Set ANTHROPIC_API_KEY in Railway to activate Brian." });
  }

  if (ANTHROPIC_API_KEY) {
    try {
      return await callAnthropicStream(ANTHROPIC_API_KEY, messages, canvasNodes, canvasEdges, credContext, res);
    } catch (err) {
      const s = err.status || err.response?.status;
      console.warn("[Brian/stream] Anthropic failed:", s, err.message);
      if (s === 401 || s === 403) {
        return res.status(503).json({ message: "ANTHROPIC_API_KEY is invalid." });
      }
      if (!GROQ_API_KEY && !GOOGLE_AI_KEY) {
        return res.status(500).json({ message: "AI provider error. Please try again." });
      }
    }
  }

  // Groq / Gemini fallback — non-streaming, emit via SSE
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

  if (GROQ_API_KEY) {
    const payload = [
      { role: "system", content: buildSystemPrompt(canvasNodes, canvasEdges, credContext) },
      ...history,
      { role: "user", content: userText },
    ];
    try {
      const raw     = await callGroq(GROQ_API_KEY, GROQ_MODEL, payload)
                        .catch(() => callGroq(GROQ_API_KEY, GROQ_FAST, payload));
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
      if (!GOOGLE_AI_KEY) {
        sendEvent({ type: "error", message: "AI provider error. Please try again." });
        return res.end();
      }
    }
  }

  if (GOOGLE_AI_KEY) {
    try {
      const raw     = await callGemini(GOOGLE_AI_KEY, messages, canvasNodes, canvasEdges, credContext);
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
  const { messages = [], canvasContext = {} } = req.body;
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ message: "Empty messages." });
  if (messages.length > 100) return res.status(400).json({ message: "Too many messages in history." });

  const validationError = validateMessages(messages);
  if (validationError) return res.status(400).json({ message: validationError });

  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();
  if (!userText) return res.status(400).json({ message: "Empty message." });
  if (userText.length > 8000) return res.status(400).json({ message: "Message too long (max 8000 characters)." });

  const canvasNodes = Array.isArray(canvasContext) ? canvasContext : (canvasContext?.nodes || []);
  const canvasEdges = Array.isArray(canvasContext) ? [] : (canvasContext?.edges || []);

  const credContext = await buildCredentialContext(req.user.id);
  const preflight = buildBrianPreflightQuestions(messages, userText);
  if (preflight) return res.json({ text: preflight.intro, questions: preflight.questions, flow: null });

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

  if (!ANTHROPIC_API_KEY && !GROQ_API_KEY && !GOOGLE_AI_KEY) {
    return res.status(503).json({ message: "Set ANTHROPIC_API_KEY in Railway to activate Brian." });
  }

  if (ANTHROPIC_API_KEY) {
    try {
      return res.json(await callAnthropic(ANTHROPIC_API_KEY, messages, canvasNodes, canvasEdges, credContext));
    } catch (err) {
      const status = err.status || err.response?.status;
      console.warn("[Brian] Anthropic failed:", status, err.message);
      if (status === 401 || status === 403) return res.status(503).json({ message: "ANTHROPIC_API_KEY is invalid." });
      if (!GROQ_API_KEY && !GOOGLE_AI_KEY) return res.status(500).json({ message: "AI provider error. Please try again." });
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

  if (GROQ_API_KEY) {
    const payload = [
      { role: "system", content: buildSystemPrompt(canvasNodes, canvasEdges, credContext) },
      ...history,
      { role: "user", content: userText },
    ];
    try {
      const raw     = await callGroq(GROQ_API_KEY, GROQ_MODEL, payload)
                        .catch(() => callGroq(GROQ_API_KEY, GROQ_FAST, payload));
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch { return res.json({ text: raw, flow: null }); }
      return res.json({ text: parsed.text || "", flow: normalizeFlow(parsed) });
    } catch (err) {
      console.warn("[Brian] Groq failed:", err.response?.status, err.message);
      if (!GOOGLE_AI_KEY) return res.status(500).json({ message: "AI provider error. Please try again." });
    }
  }

  if (GOOGLE_AI_KEY) {
    try {
      const raw     = await callGemini(GOOGLE_AI_KEY, messages, canvasNodes, canvasEdges, credContext);
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
