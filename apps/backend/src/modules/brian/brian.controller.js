import axios from "axios";

// ─── Groq config ──────────────────────────────────────────────────────────────
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";
const PRIMARY      = process.env.BRIAN_MODEL   || "llama-3.3-70b-versatile";
const FALLBACK     = "llama-3.1-8b-instant";   // fastest Groq model, used if primary fails
const sleep        = ms => new Promise(r => setTimeout(r, ms));

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Brian, the AI workflow builder for BlinkBox (like Zapier/Make).

You MUST respond with a single valid JSON object — no markdown, no prose, nothing else.

───────────────────────────────────────────────
TRIGGER node backendTypes (type: "trigger", always exactly one, always first):
manual, webhook, cron_trigger, rss_trigger, imap_trigger, gmail_trigger,
slack_trigger, discord_trigger, telegram_trigger, github_trigger,
shopify_trigger, linear_trigger, notion_trigger, airtable_trigger,
stripe_trigger, hubspot_trigger, youtube_trigger, reddit_trigger,
google_calendar_trigger, price_alert_trigger, chat_trigger, form_trigger,
db_trigger, error_trigger

ACTION node backendTypes (type: "action"):
http_request, code, data_mapper, logic_router, web_scraper,
ai_agent, ai_classify, ai_extract, ai_transform, ai_decision,
email_parser, vector_memory,
slack, discord, telegram, whatsapp, twilio, sendgrid, gmail, resend,
airtable, google_sheets, notion, mongodb, postgres, redis, firebase, supabase,
github, jira, linear, stripe, shopify, hubspot, zoom,
openai, anthropic, gemini, deepseek, groq, perplexity,
loop, merge, filter_array, sort_array, deduplicate, batch_split,
delay, approval, sub_workflow,
csv_parser, json_validator, template_renderer, text_splitter,
date_time, crypto_utils, data_diff, aggregate, set_fields,
qr_code, image_resize, pdf_generator,
twitter, web_search, elevenlabs, pinecone, notify_hub

───────────────────────────────────────────────
REQUIRED JSON SHAPE — copy this structure exactly:

{
  "text": "Short explanation of the workflow (1-3 sentences)",
  "flow": {
    "nodes": [
      {"id":"n1","type":"custom","position":{"x":300,"y":200},"data":{"label":"Webhook","backendType":"webhook","type":"trigger","config":{}}},
      {"id":"n2","type":"custom","position":{"x":300,"y":400},"data":{"label":"Process","backendType":"code","type":"action","config":{}}},
      {"id":"n3","type":"custom","position":{"x":300,"y":600},"data":{"label":"Send Slack","backendType":"slack","type":"action","config":{}}}
    ],
    "edges": [
      {"id":"e1","source":"n1","target":"n2","type":"configurable","data":{"conditionPath":""}},
      {"id":"e2","source":"n2","target":"n3","type":"configurable","data":{"conditionPath":""}}
    ]
  }
}

───────────────────────────────────────────────
RULES:
1. Trigger node always at x:300 y:200. Each next node: y += 200. Branches: x ± 300.
2. Every node must be reachable from the trigger through edges.
3. Aim for 3-7 nodes unless complexity is explicitly requested.
4. Vague or unclear prompt → use webhook → code → slack as the default flow.
5. Pure question (not a workflow request) → set flow to null, answer in text.
6. NEVER output anything except the JSON object.`;

// ─── Normalize model output → exact canvas format ────────────────────────────
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
    const bt      = n.backendType || n.data?.backendType || n.type || "manual";
    const cleanBt = TRIGGERS.has(bt) ? bt : (bt === "custom" ? "manual" : bt);
    const isTrig  = TRIGGERS.has(cleanBt) || n.data?.type === "trigger" || i === 0 && !n.data?.type;
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

  // Auto-wire if model forgot edges
  if (!normEdges.length && normNodes.length > 1) {
    normEdges = normNodes.slice(0, -1).map((n, i) => ({
      id: `e${i + 1}`, source: n.id, target: normNodes[i + 1].id,
      type: "configurable", data: { conditionPath: "" }, style: {},
    }));
  }

  return { nodes: normNodes, edges: normEdges };
}

// ─── Groq request (retries on rate-limit, falls back to smaller model) ────────
async function callGroq(apiKey, model, messages) {
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) await sleep(attempt * 2000);
    try {
      const res = await axios.post(
        GROQ_URL,
        {
          model,
          messages,
          temperature:     0.2,
          max_tokens:      4096,
          response_format: { type: "json_object" },
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          timeout: 28000,
        },
      );
      return res.data.choices[0].message.content;
    } catch (err) {
      if (err.response?.status !== 429 || attempt === 2) throw err;
      console.log(`[Brian] 429 on ${model} — retry ${attempt + 1}/2`);
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function brianChat(req, res) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      message: "Brian needs a Groq API key. Visit console.groq.com → API Keys → Create → add GROQ_API_KEY to Railway Variables. It's free.",
    });
  }

  const { messages = [] } = req.body;
  const lastMsg  = messages[messages.length - 1];
  const userText = (lastMsg?.content || lastMsg?.text || "").trim();
  if (!userText) return res.status(400).json({ message: "Empty message." });

  // Build OpenAI-style chat history, strip leading assistant turns
  let history = messages.slice(0, -1).map(m => ({
    role:    m.role === "user" ? "user" : "assistant",
    content: (m.content || m.text || " ").trim(),
  }));
  const firstUser = history.findIndex(m => m.role === "user");
  if (firstUser > 0)  history = history.slice(firstUser);
  if (firstUser === -1) history = [];

  const payload = [
    { role: "system",    content: SYSTEM_PROMPT },
    ...history,
    { role: "user",      content: userText },
  ];

  let raw;
  try {
    // Try primary model first
    raw = await callGroq(apiKey, PRIMARY, payload);
  } catch (primaryErr) {
    console.warn(`[Brian] primary model (${PRIMARY}) failed:`, primaryErr.response?.status, primaryErr.message);
    // Auto-fallback to fast model — user never sees this happen
    try {
      raw = await callGroq(apiKey, FALLBACK, payload);
    } catch (fallbackErr) {
      const status  = fallbackErr.response?.status;
      const errMsg  = fallbackErr.response?.data?.error?.message || fallbackErr.message;
      console.error("[Brian] fallback also failed:", status, errMsg);
      if (status === 401) return res.status(503).json({ message: "GROQ_API_KEY is invalid. Update it in Railway → Variables." });
      if (status === 429) return res.status(429).json({ message: "Groq is rate-limited. Wait a moment and try again." });
      if (fallbackErr.code === "ECONNABORTED") return res.status(504).json({ message: "Brian timed out. Try a shorter prompt." });
      return res.status(500).json({ message: `Brian error: ${errMsg}` });
    }
  }

  console.log("[Brian] raw output:", raw?.slice(0, 400));

  let parsed;
  try   { parsed = JSON.parse(raw); }
  catch { return res.json({ text: raw || "Done.", flow: null }); }

  return res.json({
    text: parsed.text || "",
    flow: normalizeFlow(parsed),
  });
}
