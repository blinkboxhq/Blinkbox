import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Config ───────────────────────────────────────────────────────────────────
const GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL  = process.env.BRIAN_MODEL || "llama-3.3-70b-versatile";
const GROQ_FAST   = "llama-3.1-8b-instant";
const GEMINI_MODEL = "gemini-2.0-flash";
const sleep        = ms => new Promise(r => setTimeout(r, ms));

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Brian, the AI workflow builder for BlinkBox (like Zapier/Make).

You MUST respond with a single valid JSON object — no markdown, no prose, nothing else.

TRIGGER backendTypes (type:"trigger", always first, exactly one):
manual, webhook, cron_trigger, rss_trigger, imap_trigger, gmail_trigger,
slack_trigger, discord_trigger, telegram_trigger, github_trigger,
shopify_trigger, linear_trigger, notion_trigger, airtable_trigger,
stripe_trigger, hubspot_trigger, youtube_trigger, reddit_trigger,
google_calendar_trigger, price_alert_trigger, chat_trigger, form_trigger,
db_trigger, error_trigger

ACTION backendTypes (type:"action"):
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

REQUIRED JSON SHAPE — follow exactly:
{
  "text": "1-3 sentence explanation of the workflow",
  "flow": {
    "nodes": [
      {"id":"n1","type":"custom","position":{"x":300,"y":200},"data":{"label":"Webhook","backendType":"webhook","type":"trigger","config":{}}},
      {"id":"n2","type":"custom","position":{"x":300,"y":400},"data":{"label":"Process","backendType":"code","type":"action","config":{}}},
      {"id":"n3","type":"custom","position":{"x":300,"y":600},"data":{"label":"Notify Slack","backendType":"slack","type":"action","config":{}}}
    ],
    "edges": [
      {"id":"e1","source":"n1","target":"n2","type":"configurable","data":{"conditionPath":""}},
      {"id":"e2","source":"n2","target":"n3","type":"configurable","data":{"conditionPath":""}}
    ]
  }
}

RULES:
1. Trigger node: x:300 y:200. Each next node: y+=200. Branches: x±300.
2. Every node reachable from trigger via edges.
3. 3-7 nodes unless more complexity requested.
4. Vague prompt → use webhook → code → slack as default.
5. Pure question → set flow to null, answer in text.
6. Return ONLY the JSON object. Nothing else.`;

// ─── Normalise any shape the model returns → canvas format ────────────────────
const TRIGGERS = new Set([
  "manual","webhook","cron_trigger","rss_trigger","imap_trigger","gmail_trigger",
  "slack_trigger","discord_trigger","telegram_trigger","github_trigger",
  "shopify_trigger","linear_trigger","notion_trigger","airtable_trigger",
  "stripe_trigger","hubspot_trigger","youtube_trigger","reddit_trigger",
  "google_calendar_trigger","price_alert_trigger","chat_trigger","form_trigger",
  "db_trigger","error_trigger",
]);

function normalizeFlow(parsed) {
  const src   = parsed.flow || parsed.workflow || parsed;
  const nodes = src.nodes || parsed.nodes || [];
  const edges = src.edges || parsed.edges || [];
  if (!nodes.length) return null;

  const normNodes = nodes.map((n, i) => {
    const bt     = n.backendType || n.data?.backendType || n.type || "manual";
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
    data:   { conditionPath: e.conditionPath || e.data?.conditionPath || "" },
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

// ─── Provider: Groq ───────────────────────────────────────────────────────────
async function callGroq(apiKey, model, messages) {
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) await sleep(attempt * 2000);
    try {
      const res = await axios.post(GROQ_URL, {
        model,
        messages,
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

// ─── Provider: Google Gemini ──────────────────────────────────────────────────
async function callGemini(apiKey, messages) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  });

  // history = all but last message, stripped of leading model turns
  let history = messages.slice(0, -1).map(m => ({
    role:  m.role === "user" ? "user" : "model",
    parts: [{ text: m.content || " " }],
  }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0) history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  const lastMsg = messages[messages.length - 1];
  const userText = lastMsg?.content?.trim() || lastMsg?.text?.trim() || "";

  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) await sleep(attempt * 2000);
    try {
      const chat   = model.startChat({ history });
      const result = await chat.sendMessage(userText);
      return result.response.text();
    } catch (err) {
      if (err.status !== 429 || attempt === 2) throw err;
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function brianChat(req, res) {
  const groqKey   = process.env.GROQ_API_KEY;
  const googleKey = process.env.GOOGLE_AI_KEY;

  if (!groqKey && !googleKey) {
    return res.status(503).json({
      message: "Brian has no AI key. Add either GROQ_API_KEY (free at console.groq.com) or GOOGLE_AI_KEY (free at aistudio.google.com) to Railway Variables.",
    });
  }

  const { messages = [] } = req.body;
  const lastMsg  = messages[messages.length - 1];
  const userText = (lastMsg?.content || lastMsg?.text || "").trim();
  if (!userText) return res.status(400).json({ message: "Empty message." });

  // OpenAI-style history for Groq
  let history = messages.slice(0, -1).map(m => ({
    role:    m.role === "user" ? "user" : "assistant",
    content: (m.content || m.text || " ").trim(),
  }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)    history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  const groqPayload = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user",   content: userText },
  ];

  let raw;

  // Try Groq first (preferred — JSON mode, open-source models)
  if (groqKey) {
    try {
      raw = await callGroq(groqKey, GROQ_MODEL, groqPayload);
      console.log("[Brian] Groq response:", raw?.slice(0, 300));
    } catch (err) {
      console.warn("[Brian] Groq failed:", err.response?.status, err.message);
      // Fall through to Google if Groq fails
    }
  }

  // Fall back to Google Gemini
  if (!raw && googleKey) {
    try {
      raw = await callGemini(googleKey, messages);
      console.log("[Brian] Gemini response:", raw?.slice(0, 300));
    } catch (err) {
      const status = err.status || err.response?.status;
      const msg    = err.message || "Unknown error";
      console.error("[Brian] Gemini also failed:", status, msg);
      if (status === 401 || status === 403) return res.status(503).json({ message: "GOOGLE_AI_KEY is invalid." });
      if (status === 429) return res.status(429).json({ message: "AI provider rate-limited. Try again in a moment." });
      return res.status(500).json({ message: `Brian error: ${msg}` });
    }
  }

  if (!raw) {
    return res.status(500).json({ message: "Brian could not get a response. Check your API keys in Railway." });
  }

  // Strip markdown fences Gemini might add
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  let parsed;
  try   { parsed = JSON.parse(cleaned); }
  catch { return res.json({ text: raw, flow: null }); }

  return res.json({ text: parsed.text || "", flow: normalizeFlow(parsed) });
}
