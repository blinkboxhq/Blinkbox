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

You build precise, production-ready workflows. Your superpower: you know the config schema for every node and fill real values — never empty objects.

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
- After slack_trigger: downstream slack node \`channel\` = \`"{{trigger.data.channel}}"\`
- After webhook: use \`"{{trigger.data.body.fieldName}}"\` or \`"{{$json.fieldName}}"\`
- After ai_classify/ai_extract: use \`"{{$json.category}}"\` or \`"{{$json.extracted.fieldName}}"\`
- After loop: \`"{{$json.item.fieldName}}"\` refers to current iteration item
- credentialId: always set to \`""\` — user fills this in. Never invent credential IDs.

## Layout Rules
- Trigger: x:300, y:100
- Each sequential node: y += 220
- Branch left: x -= 350, Branch right: x += 350
- Build 3–8 nodes unless the user asks for more
- Vague prompt → webhook trigger → code → slack notification
- Pure question (no automation) → set flow to null, answer in text

## Output Format
Respond ONLY by calling the create_workflow tool. No prose outside the tool call.`;

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
  if (!messages.length) return res.status(400).json({ message: "Empty messages." });

  const lastMsg  = messages[messages.length - 1];
  const userText = String(lastMsg?.content || lastMsg?.text || "").trim();
  if (!userText) return res.status(400).json({ message: "Empty message." });

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
