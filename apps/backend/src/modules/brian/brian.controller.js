import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NODE_KB, buildNodeRef } from "./brian.nodes.js";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
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

// Build the node reference once at startup — injected into every system prompt
const NODE_REF = buildNodeRef();

const SYSTEM_PROMPT = `You are Brian — the senior AI workflow architect inside Blinkbox, an automation platform.

You are a real conversational agent with deep expertise in automation. Before generating any workflow, think through:
1. What is the user's actual end goal (not just what they said)?
2. What could go wrong mid-workflow that needs handling?
3. What intermediate steps (classify, filter, extract, format) would a senior engineer add that the user didn't mention?
4. Are all node configs complete enough to run without manual edits?

## Node Config Reference
Each line: backendType: requiredField(ex:"value") | opt:optionalFields → outputFields
${NODE_REF}

## Variable Syntax
- Reference previous node output: \`{{$json.fieldName}}\`
- Reference trigger data: \`{{trigger.data.fieldName}}\`
- Reference specific node: \`{{nodes.n2.output.fieldName}}\`
- JS expressions: \`{{$json.price * 1.1}}\`, \`{{new Date().toISOString()}}\`
- String interpolation: \`"Hello {{$json.firstName}} {{$json.lastName}}"\`

## Smart Chaining Rules
- After gmail_trigger: \`to\` = \`"{{trigger.data.from}}"\`, \`threadId\` = \`"{{trigger.data.threadId}}"\`
- After slack_trigger: \`channel\` = \`"{{trigger.data.channel}}"\`
- After webhook: \`"{{trigger.data.body.fieldName}}"\` or \`"{{$json.fieldName}}"\`
- After ai_classify: \`"{{$json.category}}"\` in downstream conditions
- After ai_extract: \`"{{$json.extracted.fieldName}}"\` for each field
- After ai_transform: \`"{{$json.result}}"\` for the transformed text
- After http_request: \`"{{$json.data.fieldName}}"\` for JSON response body
- After loop: \`"{{$json.item.fieldName}}"\` refers to current item
- credentialId: always \`""\` — user fills this in. Never invent credential IDs.

## 2D Canvas Layout — CRITICAL
Nodes in 2D space, never a single column.

**Main trunk:** Trigger x:400 y:80 → each step y+220
**Branch split at condition node:**
- True path (right):  x:680, condition_y+220 increments
- False path (left):  x:120, condition_y+220 increments
- Merge node after:   x:400, deepest_y+220
**Parallel fan-out:**
- 2 services: x:200 and x:600, same y
- 3 services: x:100, x:400, x:700, same y

Never place two nodes at the same (x,y). Build 4–8 nodes for typical requests.
**Always include a trigger node as the first node.** Triggers: manual (for testing), webhook, cron_trigger, gmail_trigger, slack_trigger, etc.

## ✅ REQUIRED: Config Quality Bar
Every node config MUST have real, meaningful values. A workflow that would require manual editing before it can run is a failure.

**GOOD config (ai_transform):**
\`\`\`json
{
  "prompt": "You are a customer support specialist. The user sent this message: {{$json.body}}. Write a professional, empathetic reply that acknowledges their issue and promises follow-up within 24 hours. Keep it under 150 words.",
  "model": "gpt-4o-mini",
  "credentialId": ""
}
\`\`\`

**BAD config (never do this):**
\`\`\`json
{ "prompt": "Summarize the content", "model": "" }
\`\`\`

**GOOD config (slack):**
\`\`\`json
{
  "channel": "#alerts",
  "text": "🚨 New support ticket from {{$json.email}}: {{$json.subject}}\nPriority: {{$json.priority}}\nView: https://app.example.com/tickets/{{$json.id}}",
  "credentialId": ""
}
\`\`\`

**BAD config (never do this):**
\`\`\`json
{ "channel": "", "text": "New notification" }
\`\`\`

## ❌ FORBIDDEN Anti-Patterns
These are failure modes — never do any of them:

1. **Empty configs**: \`config: {}\` or \`config: { credentialId: "" }\` — every node needs real field values
2. **Placeholder text**: "Enter your message here", "Configure this node", "Your subject line", "Notification"
3. **Generic labels**: "Node 1", "Action", "Step 3" — labels must describe what the node does ("Filter Spam Emails", "Post to #alerts")
4. **Missing AI prompts**: ai_transform/ai_extract/ai_classify nodes without a real, specific prompt written out
5. **Bare cron schedules**: never leave schedule empty — "daily" → \`"0 9 * * *"\`, "hourly" → \`"0 * * * *"\`, "weekdays" → \`"0 9 * * 1-5"\`
6. **Broken variable chains**: using \`{{$json.field}}\` without confirming the upstream node actually outputs that field
7. **Single-column layouts**: all nodes stacked vertically at x:400 — use 2D placement

## Design Heuristics
1. **Classify before routing** — if content varies (email could be spam/support/sales), add ai_classify before condition
2. **Extract before templating** — add ai_extract to pull structured fields before formatting messages
3. **Filter early** — add filter node after trigger if only some events should proceed
4. **Real subject lines** — write the actual message text matching the workflow intent
5. **Scraping** → always set \`waitFor: "networkidle"\` for JS-heavy pages
6. **AI prompts** — write the exact system prompt, as if you're deploying it to production today
7. **Error handling** — for critical paths (payment, CRM), add a success_failed node before notifications

## Workflow Patterns (apply when request matches)
- **Email auto-reply**: gmail_trigger → ai_classify → condition → ai_transform(draft reply) → gmail(send)
- **Slack digest**: cron_trigger → http_request → ai_extract → slack(post to #channel with full formatted message)
- **Lead enrichment**: webhook → http_request(enrich API) → hubspot(create contact) → slack(notify #sales)
- **Price monitoring**: cron_trigger → web_scraper → condition(price threshold) → sendgrid(alert email with price)
- **Stripe revenue alert**: stripe_trigger → set_fields(format amount/currency) → slack(#revenue with amount)
- **GitHub PR summary**: github_trigger(pull_request) → ai_transform(summarize diff) → slack(post to #engineering)
- **RSS to Notion**: rss_trigger → ai_extract(title,summary,tags,url) → notion(create page with all fields)
- **Form → CRM**: form_trigger → ai_classify(lead quality: hot/warm/cold) → hubspot(create deal) → sendgrid(personalized confirm)
- **Support ticket routing**: webhook → ai_classify(department) → condition → route to slack channels or email

## When to use create_workflow vs plain text
- **User asks to build/create/automate something** → call create_workflow with full nodes and edges
- **User asks a question** ("what does X do?", "how does Stripe work?") → respond in plain text, no tool call
- **You need clarification** ("what app do you use for email?") → respond in plain text with your question
- **Empty workflow** (pure question answer) → call create_workflow with nodes:[] edges:[] and answer in text field`;

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
            sourceHandle: { type: "string", description: "Only set for condition nodes: 'true' or 'false'" },
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

  const canvasNodes = nodes.map((n, i) => ({
    id:       String(n.id || `n${i + 1}`),
    type:     "custom",
    position: { x: Number(n.x) || 300, y: Number(n.y) || (100 + i * 220) },
    data: {
      label:       n.label || n.backendType,
      backendType: n.backendType || "manual",
      type:        n.nodeType === "trigger" ? "trigger" : "action",
      config:      n.config || {},
    },
  }));

  let canvasEdges = edges
    .map((e, i) => ({
      id:           String(e.id || `e${i + 1}`),
      source:       String(e.source || ""),
      target:       String(e.target || ""),
      sourceHandle: e.sourceHandle || null,
      type:         "configurable",
      data:         { conditionPath: "" },
      style:        {},
    }))
    .filter(e => e.source && e.target);

  if (!canvasEdges.length && canvasNodes.length > 1) {
    canvasEdges = canvasNodes.slice(0, -1).map((n, i) => ({
      id: `e${i + 1}`, source: n.id, target: canvasNodes[i + 1].id,
      sourceHandle: null, type: "configurable", data: { conditionPath: "" }, style: {},
    }));
  }

  // Auto-fix: ensure no two nodes share the same position
  const positionsSeen = new Set();
  canvasNodes.forEach(n => {
    const key = `${n.position.x},${n.position.y}`;
    if (positionsSeen.has(key)) {
      n.position.x += 220;
    }
    positionsSeen.add(`${n.position.x},${n.position.y}`);
  });

  // Auto-fix: ensure trigger node has type "trigger" not "action"
  if (canvasNodes.length > 0) {
    const TRIGGER_TYPES = new Set(["manual","webhook","cron_trigger","rss_trigger","imap_trigger","gmail_trigger","slack_trigger","discord_trigger","telegram_trigger","github_trigger","shopify_trigger","linear_trigger","notion_trigger","airtable_trigger","stripe_trigger","hubspot_trigger","youtube_trigger","reddit_trigger","google_calendar_trigger","form_trigger","chat_trigger"]);
    canvasNodes[0].data.type = TRIGGER_TYPES.has(canvasNodes[0].data.backendType) ? "trigger" : canvasNodes[0].data.type;
  }

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

// ── Provider 2: Anthropic Claude (primary) ────────────────────────────────────
async function callAnthropic(apiKey, messages) {
  const client = new Anthropic({ apiKey });

  // Build clean alternating history — Anthropic requires user/assistant alternation
  const rawHistory = messages.slice(0, -1);
  let history = rawHistory
    .filter(m => m.content || m.text)
    .map(m => ({
      role:    m.role === "user" ? "user" : "assistant",
      content: String(m.content || m.text || "").trim(),
    }));

  // Ensure it starts with a user message
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)    history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();

  const response = await client.messages.create({
    model:       ANTHROPIC_MODEL,
    max_tokens:  16000,
    thinking:    { type: "enabled", budget_tokens: 8000 },
    system:      SYSTEM_PROMPT,
    messages:    [...history, { role: "user", content: userText }],
    tools:       [WORKFLOW_TOOL],
    tool_choice: { type: "auto" },
  });

  const toolUse = response.content.find(b => b.type === "tool_use");
  if (toolUse?.input) {
    const { text, nodes, edges } = toolUse.input;
    return {
      text: text || "",
      flow: nodes?.length ? toolToCanvas({ nodes, edges }) : null,
    };
  }

  const textBlock = response.content.find(b => b.type === "text");
  return { text: textBlock?.text || "", flow: null };
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
async function callGemini(apiKey, messages) {
  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
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

// ── Route handler ─────────────────────────────────────────────────────────────
export async function brianChat(req, res) {
  const { messages = [] } = req.body;
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ message: "Empty messages." });
  if (messages.length > 100) return res.status(400).json({ message: "Too many messages in history." });

  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();
  if (!userText) return res.status(400).json({ message: "Empty message." });
  if (userText.length > 8000) return res.status(400).json({ message: "Message too long (max 8000 characters)." });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey      = process.env.GROQ_API_KEY;
  const googleKey    = process.env.GOOGLE_AI_KEY;

  // ── Path 1: BlinkBox webhook ───────────────────────────────────────────────
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
    return res.status(503).json({
      message: "Set ANTHROPIC_API_KEY in Railway to activate Brian.",
    });
  }

  // ── Path 2: Anthropic (primary — best quality) ────────────────────────────
  if (anthropicKey) {
    try {
      return res.json(await callAnthropic(anthropicKey, messages));
    } catch (err) {
      const status = err.status || err.response?.status;
      console.warn("[Brian] Anthropic failed:", status, err.message);
      if (status === 401 || status === 403) {
        return res.status(503).json({ message: "ANTHROPIC_API_KEY is invalid." });
      }
      if (!groqKey && !googleKey) {
        return res.status(500).json({ message: "AI provider error. Please try again." });
      }
    }
  }

  // Build shared history format for Groq / Gemini
  let history = messages.slice(0, -1)
    .filter(m => m.content || m.text)
    .map(m => ({
      role:    m.role === "user" ? "user" : "assistant",
      content: String(m.content || m.text || " ").trim(),
    }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)    history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  // ── Path 3: Groq ───────────────────────────────────────────────────────────
  if (groqKey) {
    const payload = [
      { role: "system", content: SYSTEM_PROMPT },
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

  // ── Path 4: Gemini ─────────────────────────────────────────────────────────
  if (googleKey) {
    try {
      const raw     = await callGemini(googleKey, messages);
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
