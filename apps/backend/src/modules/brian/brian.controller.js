import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Config ─────────────────────────────────────────────────────────────────────
//
// Priority order:
//   1. BRIAN_WEBHOOK_URL  — your BlinkBox workflow (webhook?wait=true)  ← preferred
//   2. ANTHROPIC_API_KEY  — direct Claude call
//   3. GROQ_API_KEY       — direct Groq call
//   4. GOOGLE_AI_KEY      — direct Gemini call
//
// Set up BRIAN_WEBHOOK_URL in Railway:
//   https://your-domain.railway.app/webhook/<automationId>?wait=true
//
const BRIAN_WEBHOOK_URL = process.env.BRIAN_WEBHOOK_URL || "";
const ANTHROPIC_MODEL   = "claude-opus-4-7";
const GROQ_URL          = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL        = "llama-3.3-70b-versatile";
const GROQ_FAST         = "llama-3.1-8b-instant";
const sleep             = ms => new Promise(r => setTimeout(r, ms));

// ── Trigger types (for normalizer) ────────────────────────────────────────────
const TRIGGERS = new Set([
  "manual","webhook","cron_trigger","rss_trigger","imap_trigger","gmail_trigger",
  "slack_trigger","discord_trigger","telegram_trigger","github_trigger",
  "shopify_trigger","linear_trigger","notion_trigger","airtable_trigger",
  "stripe_trigger","hubspot_trigger","youtube_trigger","reddit_trigger",
  "google_calendar_trigger","price_alert_trigger","chat_trigger","form_trigger",
  "db_trigger","error_trigger",
]);

// ── System prompt (used by direct AI fallbacks) ────────────────────────────────
const SYSTEM_PROMPT = `You are Brian, the AI workflow builder for BlinkBox — an automation platform like Zapier.

You MUST always respond with ONLY a valid JSON object, no markdown, no prose.

TRIGGER backendTypes (nodeType:"trigger", always first, exactly one):
manual, webhook, cron_trigger, rss_trigger, imap_trigger, gmail_trigger,
slack_trigger, discord_trigger, telegram_trigger, github_trigger,
shopify_trigger, linear_trigger, notion_trigger, airtable_trigger,
stripe_trigger, hubspot_trigger, youtube_trigger, reddit_trigger,
google_calendar_trigger, price_alert_trigger, chat_trigger, form_trigger,
db_trigger, error_trigger

ACTION backendTypes (nodeType:"action"):
http_request, code, data_mapper, logic_router, web_scraper,
ai_agent, ai_classify, ai_extract, ai_transform, ai_decision, email_parser,
slack, discord, telegram, whatsapp, twilio, sendgrid, gmail, resend,
airtable, google_sheets, notion, mongodb, postgres, redis, firebase, supabase,
github, jira, linear, stripe, shopify, hubspot, zoom,
openai, anthropic, gemini, deepseek, groq, perplexity,
loop, merge, filter_array, sort_array, deduplicate, batch_split,
delay, approval, sub_workflow, csv_parser, json_validator, template_renderer,
text_splitter, date_time, crypto_utils, data_diff, aggregate, set_fields,
qr_code, image_resize, pdf_generator, twitter, web_search, elevenlabs,
pinecone, notify_hub, vector_memory

Required JSON shape:
{
  "text": "1-3 sentence explanation",
  "flow": {
    "nodes": [
      {"id":"n1","type":"custom","position":{"x":300,"y":200},"data":{"label":"Webhook","backendType":"webhook","type":"trigger","config":{}}},
      {"id":"n2","type":"custom","position":{"x":300,"y":400},"data":{"label":"Process","backendType":"code","type":"action","config":{}}}
    ],
    "edges": [
      {"id":"e1","source":"n1","target":"n2","type":"configurable","data":{"conditionPath":""}}
    ]
  }
}

Rules:
- Trigger at x:300 y:200, each next node y+=200, branches x±300
- 3-7 nodes unless more is asked
- Vague prompt → webhook → code → slack
- Pure question → flow:null, answer in text`;

// ── Claude tool definition (for Anthropic path) ───────────────────────────────
const WORKFLOW_TOOL = {
  name: "create_workflow",
  description: "Create a BlinkBox automation workflow. Always call this tool.",
  input_schema: {
    type: "object",
    properties: {
      text: { type: "string", description: "1-3 sentence explanation" },
      nodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id:          { type: "string" },
            backendType: { type: "string" },
            label:       { type: "string" },
            nodeType:    { type: "string", enum: ["trigger", "action"] },
            x:           { type: "number" },
            y:           { type: "number" },
          },
          required: ["id", "backendType", "label", "nodeType", "x", "y"],
          additionalProperties: false,
        },
      },
      edges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id:     { type: "string" },
            source: { type: "string" },
            target: { type: "string" },
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

// ── Convert Claude tool output → ReactFlow canvas format ──────────────────────
function toolToCanvas({ nodes = [], edges = [] }) {
  if (!nodes.length) return null;

  const canvasNodes = nodes.map((n, i) => ({
    id:       String(n.id || `n${i + 1}`),
    type:     "custom",
    position: { x: Number(n.x) || 300, y: Number(n.y) || (200 + i * 200) },
    data: {
      label:       n.label || n.backendType,
      backendType: n.backendType || "manual",
      type:        n.nodeType === "trigger" ? "trigger" : "action",
      config:      {},
    },
  }));

  let canvasEdges = edges
    .map((e, i) => ({
      id:     String(e.id || `e${i + 1}`),
      source: String(e.source || ""),
      target: String(e.target || ""),
      type:   "configurable",
      data:   { conditionPath: "" },
      style:  {},
    }))
    .filter(e => e.source && e.target);

  if (!canvasEdges.length && canvasNodes.length > 1) {
    canvasEdges = canvasNodes.slice(0, -1).map((n, i) => ({
      id: `e${i + 1}`, source: n.id, target: canvasNodes[i + 1].id,
      type: "configurable", data: { conditionPath: "" }, style: {},
    }));
  }

  return { nodes: canvasNodes, edges: canvasEdges };
}

// ── Normalise plain-JSON response (Groq / Gemini paths) ───────────────────────
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
      position: { x: Number(pos.x) || 300, y: Number(pos.y) || 200 + i * 200 },
      data: {
        label:       n.label || n.data?.label || n.name || cleanBt,
        backendType: cleanBt,
        type:        isTrig ? "trigger" : "action",
        config:      n.config || n.data?.config || {},
      },
    };
  });

  let normEdges = edges.map((e, i) => ({
    id:     String(e.id || `e${i + 1}`),
    source: String(e.source || e.from || ""),
    target: String(e.target || e.to   || ""),
    type:   "configurable",
    data:   { conditionPath: "" },
    style:  {},
  })).filter(e => e.source && e.target);

  if (!normEdges.length && normNodes.length > 1) {
    normEdges = normNodes.slice(0, -1).map((n, i) => ({
      id: `e${i + 1}`, source: n.id, target: normNodes[i + 1].id,
      type: "configurable", data: { conditionPath: "" }, style: {},
    }));
  }

  return { nodes: normNodes, edges: normEdges };
}

// ── Provider 1: Your BlinkBox webhook ─────────────────────────────────────────
// Calls your admin workflow with ?wait=true — synchronous, returns result directly.
// Workflow format: webhook_trigger → ai_node → code_node → respond_webhook
// The respond_webhook node body should be: { "text": "...", "flow": {...} }
async function callBlinkBoxWebhook(webhookUrl, userText, history) {
  const res = await axios.post(
    webhookUrl,
    { prompt: userText, history },
    { timeout: 60_000, headers: { "Content-Type": "application/json" } },
  );

  const data = res.data;

  // If using respond_webhook node: data IS the body { text, flow }
  if (data?.text !== undefined) return data;

  // Without respond_webhook: { success, output }
  if (data?.output) return data.output;

  return data;
}

// ── Provider 2: Anthropic Claude ──────────────────────────────────────────────
async function callAnthropic(apiKey, messages, userText) {
  const client = new Anthropic({ apiKey });

  let history = messages.slice(0, -1).map(m => ({
    role:    m.role === "user" ? "user" : "assistant",
    content: (m.content || m.text || " ").trim(),
  }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)    history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  const response = await client.messages.create({
    model:       ANTHROPIC_MODEL,
    max_tokens:  4096,
    system:      SYSTEM_PROMPT,
    messages:    [...history, { role: "user", content: userText }],
    tools:       [WORKFLOW_TOOL],
    tool_choice: { type: "tool", name: "create_workflow" },
  });

  console.log("[Brian] Claude model:", response.model, "stop:", response.stop_reason);

  const toolUse = response.content.find(b => b.type === "tool_use");
  if (toolUse?.input) {
    const { text, nodes, edges } = toolUse.input;
    return { text: text || "", flow: nodes?.length ? toolToCanvas({ nodes, edges }) : null };
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
        messages: payload,
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
async function callGemini(apiKey, messages, userText) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  });

  let history = messages.slice(0, -1).map(m => ({
    role:  m.role === "user" ? "user" : "model",
    parts: [{ text: m.content || m.text || " " }],
  }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0) history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  const chat   = model.startChat({ history });
  const result = await chat.sendMessage(userText);
  return result.response.text();
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function brianChat(req, res) {
  const { messages = [] } = req.body;
  const lastMsg  = messages[messages.length - 1];
  const userText = (lastMsg?.content || lastMsg?.text || "").trim();
  if (!userText) return res.status(400).json({ message: "Empty message." });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey      = process.env.GROQ_API_KEY;
  const googleKey    = process.env.GOOGLE_AI_KEY;

  // ── Path 1: BlinkBox webhook (your admin workflow) ─────────────────────────
  if (BRIAN_WEBHOOK_URL) {
    try {
      const history = messages.slice(0, -1).map(m => ({
        role:    m.role === "user" ? "user" : "assistant",
        content: m.content || m.text || "",
      }));
      const result = await callBlinkBoxWebhook(BRIAN_WEBHOOK_URL, userText, history);
      console.log("[Brian] webhook result:", JSON.stringify(result)?.slice(0, 200));

      if (result?.flow) {
        return res.json({ text: result.text || "", flow: normalizeFlow(result) });
      }
      return res.json({ text: result?.text || String(result || ""), flow: null });
    } catch (err) {
      console.warn("[Brian] webhook failed:", err.message, "— falling back to AI provider");
    }
  }

  // Check at least one AI key is available
  if (!anthropicKey && !groqKey && !googleKey) {
    return res.status(503).json({
      message: BRIAN_WEBHOOK_URL
        ? "Brian webhook failed and no AI key fallback is configured."
        : "Brian needs an API key. Set BRIAN_WEBHOOK_URL in Railway (recommended) or ANTHROPIC_API_KEY / GROQ_API_KEY.",
    });
  }

  // ── Path 2: Anthropic Claude ───────────────────────────────────────────────
  if (anthropicKey) {
    try {
      return res.json(await callAnthropic(anthropicKey, messages, userText));
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

  // Shared Groq/Gemini history format
  let history = messages.slice(0, -1).map(m => ({
    role:    m.role === "user" ? "user" : "assistant",
    content: (m.content || m.text || " ").trim(),
  }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)    history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  // ── Path 3: Groq ───────────────────────────────────────────────────────────
  if (groqKey) {
    const payload = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user",   content: userText },
    ];
    try {
      let raw = await callGroq(groqKey, GROQ_MODEL, payload)
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

  // ── Path 4: Google Gemini ──────────────────────────────────────────────────
  if (googleKey) {
    try {
      const raw = await callGemini(googleKey, messages, userText);
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
