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

const SYSTEM_PROMPT_BASE = `You are Brian — the senior AI workflow architect inside Blinkbox, an automation platform.

You are a thoughtful conversational agent. Before generating any workflow, reason through:
1. What is the user's actual end goal (not just what they literally typed)?
2. Which trigger makes the most sense — never use "manual" unless the user explicitly said "test" or "manually".
3. What intermediate steps would a senior engineer add (classify, filter, enrich, format) that the user didn't mention?
4. Are ALL node configs filled with real, production-ready values?

## Node Config Reference
Each line: backendType: requiredField(ex:"value") | opt:optionalFields → outputFields
${NODE_REF}

## ⛔ ABSOLUTE HARD RULES — Violating ANY of these is a critical failure
These rules are non-negotiable. Breaking them produces broken, unusable workflows.

**Rule 1 — Trigger is ALWAYS node n1, never a target:**
- The trigger node (gmail_trigger, webhook, cron_trigger, manual, etc.) is ALWAYS the first node.
- NO edge may have a trigger node as its \`target\`. Triggers only appear as edge \`source\`.
- NEVER place a trigger node in the middle of a workflow.

**Rule 2 — Every node must be reachable from the trigger:**
- Every single node in the \`nodes\` array must have at least one edge connecting it to the main graph.
- NO orphaned / isolated / floating nodes. If you add a node, you must connect it.

**Rule 3 — ONE connected workflow, not multiple disconnected graphs:**
- The entire output is ONE workflow. You cannot produce multiple separate chains.
- DO NOT create two separate trigger→action chains in one response.

**Rule 4 — Triggers are START nodes only:**
- \`manual\`, \`webhook\`, \`cron_trigger\`, \`gmail_trigger\`, \`slack_trigger\`, etc. are ONLY valid as the FIRST node.
- NEVER use them as intermediate action steps. To send a Gmail, use the \`gmail\` node (not \`gmail_trigger\`).

**Rule 5 — No duplicate triggers:**
- One workflow = one trigger. Never include two trigger nodes.

**BAD EXAMPLE (never produce this):**
\`\`\`
nodes: gmail_trigger → manual_trigger → logic_router   ← WRONG: manual_trigger in the middle
nodes: gmail_trigger + manual_trigger (separate)        ← WRONG: two disconnected graphs
nodes: Google Sheets (floating, no edges)               ← WRONG: orphaned node
\`\`\`

**CORRECT EXAMPLE for "Gmail → route → Discord/Slack":**
\`\`\`
n1: gmail_trigger (trigger) → n2: ai_classify (action) → n3: condition (action)
  condition true →  n4: slack (action)
  condition false → n5: discord (action)
All 5 nodes connected. No orphans. One trigger.
\`\`\`

## Variable Syntax
- Reference previous node output: \`{{$json.fieldName}}\`
- Reference trigger data: \`{{trigger.data.fieldName}}\`
- After gmail_trigger: \`{{trigger.data.from}}\`, \`{{trigger.data.subject}}\`, \`{{trigger.data.body}}\`
- After slack_trigger: \`{{trigger.data.text}}\`, \`{{trigger.data.channel}}\`
- After webhook: \`{{trigger.data.body.fieldName}}\` or \`{{$json.fieldName}}\`
- After ai_classify: \`{{$json.category}}\`
- After ai_extract: \`{{$json.extracted.fieldName}}\`
- After ai_transform: \`{{$json.result}}\`
- After http_request: \`{{$json.data.fieldName}}\`
- credentialId: always \`""\` — user fills this in. Never invent credential IDs.

## 2D Canvas Layout
**Main trunk:** Trigger x:400 y:80 → each step adds y+220 (so: y:80, 300, 520, 740…)
**Condition branch split:**
- True path (right):  x:680, same y-level increments as main trunk
- False path (left):  x:120, same y-level increments
- Merge after branch: x:400, deepest_branch_y + 220
**Parallel fan-out (two actions same level):**
- 2 parallel: x:180 and x:620, same y
- 3 parallel: x:80, x:400, x:720, same y

NEVER place two nodes at the exact same (x, y).

## ✅ Config Quality Bar — REQUIRED
Every node config must have REAL values. No workflow should need manual editing before running.

**GOOD (ai_transform):**
\`"prompt": "You are a customer support specialist. The user's message: {{$json.body}}. Write an empathetic professional reply under 150 words."\`
**BAD:** \`"prompt": "Summarize the content"\` or \`"prompt": ""\`

**GOOD (slack):**
\`"channel": "#alerts", "text": "🚨 {{$json.email}} submitted: {{$json.subject}} — priority: {{$json.priority}}"\`
**BAD:** \`"channel": "", "text": "New notification"\`

**GOOD (cron_trigger):**
\`"schedule": "0 9 * * 1-5"\` (weekdays 9am)
**BAD:** \`"schedule": ""\` or \`"schedule": "daily"\`

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
- **AI Chat agent**: chat_trigger → ai_agent(with model + tools) → (reply sent automatically)
- **Daily briefing**: cron_trigger(0 8 * * *) → http_request(news/data API) → ai_transform(format digest) → sendgrid(email digest)

## When to use create_workflow vs plain text
- **User asks to build/create/automate something** → call create_workflow with full nodes and edges
- **User asks a question** ("what does X do?", "how does Stripe work?") → respond in plain text, no tool call
- **You need clarification** ("what app do you use for email?") → respond in plain text with your question
- **Empty workflow** (pure question answer) → call create_workflow with nodes:[] edges:[] and answer in text field`;

function buildSystemPrompt(canvasNodes = []) {
  if (!canvasNodes?.length) return SYSTEM_PROMPT_BASE;

  const nodeList = canvasNodes
    .map((n, i) => `  ${i + 1}. [${n.backendType}] "${n.label}"`)
    .join("\n");

  const canvasSection = `\n\n## Current Canvas — ${canvasNodes.length} existing node${canvasNodes.length !== 1 ? "s" : ""}
${nodeList}

### Modify vs Create rules:
- User says "add", "extend", "also", "and then", "now", "next" → ADD new nodes to the existing workflow. Reuse existing node IDs in edges.
- User says "new workflow", "start over", "replace", "completely different" → Replace everything with a fresh workflow.
- Default when canvas has nodes: EXTEND, not replace.
- When extending: include ALL existing nodes in your output (same IDs, same positions) PLUS the new ones.
- Never duplicate existing nodes. Never change IDs of existing nodes.`;

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

  const TRIGGER_TYPES = new Set([
    "manual","webhook","cron_trigger","rss_trigger","imap_trigger","gmail_trigger",
    "slack_trigger","discord_trigger","telegram_trigger","github_trigger",
    "shopify_trigger","linear_trigger","notion_trigger","airtable_trigger",
    "stripe_trigger","hubspot_trigger","youtube_trigger","reddit_trigger",
    "google_calendar_trigger","form_trigger","chat_trigger","db_trigger","error_trigger",
  ]);

  // ── Step 1: Build canvas nodes ────────────────────────────────────────────
  const canvasNodes = nodes.map((n, i) => {
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

  // ── Step 2: Build and validate edges ─────────────────────────────────────
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
    .filter(e => {
      if (!e.source || !e.target) return false;
      if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return false;
      // Remove any edge that points INTO a trigger node
      const targetNode = canvasNodes.find(n => n.id === e.target);
      if (targetNode?.data?.type === "trigger") return false;
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
  const triggerNode = canvasNodes.find(n => n.data.type === "trigger") || canvasNodes[0];
  if (triggerNode && canvasNodes.length > 1) {
    const reachable = new Set([triggerNode.id]);
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
      // Re-chain removed nodes linearly to the last reachable node if any are real action nodes
      const lastReachable = [...reachable].pop();
      removed.forEach((orphan, oi) => {
        const prevId = oi === 0 ? lastReachable : removed[oi - 1].id;
        canvasEdges.push({
          id: `e_fix_${oi}`, source: prevId, target: orphan.id,
          sourceHandle: null, type: "configurable", data: { conditionPath: "" }, style: {},
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
async function callAnthropicStream(apiKey, messages, canvasNodes, res) {
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
      system:     buildSystemPrompt(canvasNodes),
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
async function callAnthropic(apiKey, messages, canvasNodes = []) {
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
    system:     buildSystemPrompt(canvasNodes),
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
async function callGemini(apiKey, messages, canvasNodes = []) {
  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: buildSystemPrompt(canvasNodes),
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
  const { messages = [], canvasContext = [] } = req.body;
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

  const canvasNodes = Array.isArray(canvasContext) ? canvasContext : [];

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
    const status = null;
    try {
      return await callAnthropicStream(anthropicKey, messages, canvasNodes, res);
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
      { role: "system", content: buildSystemPrompt(canvasNodes) },
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
      { role: "system", content: buildSystemPrompt(canvasNodes) },
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
