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

const SYSTEM_PROMPT = `You are Brian — the AI workflow architect inside BlinkBox, an automation platform.

You build precise, production-ready workflows. Your superpower: you know the config schema for every node and fill real values — never empty objects. You think like a senior automation engineer: anticipate the user's real intent, add smart intermediate steps (classify, filter, format) they didn't explicitly ask for but obviously need.

## Node Config Reference
Each line: backendType: requiredField(ex:"value") | opt:optionalFields → outputFields
${NODE_REF}

## Variable Syntax
- Reference previous node output: \`{{$json.fieldName}}\`
- Reference trigger data: \`{{trigger.data.fieldName}}\`
- Reference specific node: \`{{nodes.n2.output.fieldName}}\`
- JS expressions work: \`{{$json.price * 1.1}}\`, \`{{new Date().toISOString()}}\`
- String interpolation: \`"Hello {{$json.firstName}} {{$json.lastName}}"\`

## Smart Chaining Rules
- After gmail_trigger: downstream gmail node \`to\` = \`"{{trigger.data.from}}"\`, \`threadId\` = \`"{{trigger.data.threadId}}"\`
- After slack_trigger: downstream slack \`channel\` = \`"{{trigger.data.channel}}"\`
- After webhook: use \`"{{trigger.data.body.fieldName}}"\` or \`"{{$json.fieldName}}"\`
- After ai_classify: use \`"{{$json.category}}"\` in downstream conditions/routers
- After ai_extract: use \`"{{$json.extracted.fieldName}}"\` for each extracted field
- After ai_transform: use \`"{{$json.result}}"\` for the transformed text
- After http_request: \`"{{$json.data.fieldName}}"\` for JSON response body
- After loop: \`"{{$json.item.fieldName}}"\` refers to current item
- credentialId: always \`""\` — user fills this in. Never invent credential IDs.

## Layout Rules
- Trigger node: x:300, y:100
- Each sequential node: y += 200
- Branch left path: x -= 340
- Branch right path: x += 340
- Parallel branches rejoin via merge node at center x
- Build 4–7 nodes for typical requests; 3 only if truly simple

## Design Heuristics
1. **Classify before routing** — if data varies (email could be spam/support/sales), add ai_classify before condition
2. **Extract before templating** — if sending formatted messages, add ai_extract first to pull structured fields
3. **Filter early** — add filter node after trigger if not all events should proceed
4. **Real subject lines** — write actual subject/body text matching the workflow intent, never placeholders like "Notification"
5. **Real cron schedules** — "every morning" → "0 9 * * *", "weekdays 9am" → "0 9 * * 1-5", "hourly" → "0 * * * *"
6. **Scraping** → always set waitFor: "networkidle" for JS-heavy pages
7. **AI prompts** — write the actual system prompt text in the config, not "ask AI to summarize..."

## Workflow Patterns (apply when request matches)
- **Email auto-reply**: gmail_trigger → ai_classify → condition → ai_transform(draft reply) → gmail(send)
- **Slack digest**: cron_trigger → http_request → ai_extract → slack(post)
- **Lead enrichment**: webhook → http_request(enrich) → hubspot(create contact) → slack(notify)
- **Price monitoring**: cron_trigger → web_scraper → condition(price changed) → sendgrid(alert)
- **Stripe revenue alert**: stripe_trigger → set_fields(format amount) → slack(notify #revenue)
- **GitHub PR summary**: github_trigger(pull_request) → ai_transform(summarize changes) → slack(post)
- **RSS to Notion**: rss_trigger → ai_extract(title,summary,tags) → notion(create page)
- **Form → CRM**: form_trigger → ai_classify(lead quality) → hubspot(create deal) → sendgrid(confirm)

## Pure Question Detection
If the user asks a question (not requesting an automation) → return nodes=[] edges=[] and answer in text field.
Examples of questions: "what nodes should I use?", "how does Stripe work?" — answer in text, no flow.

## Output Format
Call create_workflow ONLY. No prose outside the tool call.`;

// ── Anthropic tool definition ─────────────────────────────────────────────────
const WORKFLOW_TOOL = {
  name: "create_workflow",
  description: "Create a BlinkBox automation workflow with fully configured nodes.",
  input_schema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "1–2 sentence explanation of what this workflow does.",
      },
      nodes: {
        type: "array",
        description: "Workflow nodes. Every node must have a populated config object — no empty configs.",
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
    max_tokens:  4096,
    system:      SYSTEM_PROMPT,
    messages:    [...history, { role: "user", content: userText }],
    tools:       [WORKFLOW_TOOL],
    tool_choice: { type: "tool", name: "create_workflow" },
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
        return res.status(500).json({ message: `Brian error: ${err.message}` });
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
      if (!googleKey) return res.status(500).json({ message: `Brian error: ${err.message}` });
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
      return res.status(500).json({ message: `Brian error: ${err.message}` });
    }
  }
}
