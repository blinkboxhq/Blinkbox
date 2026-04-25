import axios from "axios";

// Groq: free forever, open-source models, 30 req/min, no credit card needed.
// Get key in 60 seconds: console.groq.com → API Keys → Create
const GROQ_URL  = "https://api.groq.com/openai/v1/chat/completions";
const MODEL     = process.env.BRIAN_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Brian, an AI workflow builder inside BlinkBox — an automation platform like Zapier.

Return ONLY a JSON object — no markdown, no explanation, nothing else.

## Node types

TRIGGER (type:"trigger", always first, exactly one):
  manual, webhook, cron_trigger, rss_trigger, imap_trigger, gmail_trigger,
  slack_trigger, discord_trigger, telegram_trigger, github_trigger,
  shopify_trigger, linear_trigger, notion_trigger, airtable_trigger,
  stripe_trigger, hubspot_trigger, youtube_trigger, reddit_trigger,
  google_calendar_trigger, price_alert_trigger, chat_trigger, form_trigger,
  db_trigger, error_trigger

ACTION (type:"action"):
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

## Output schema

{
  "text": "1-3 sentence explanation",
  "flow": {
    "nodes": [
      {
        "id": "n1",
        "type": "custom",
        "position": { "x": 300, "y": 200 },
        "data": { "label": "Name", "backendType": "webhook", "type": "trigger", "config": {} }
      }
    ],
    "edges": [
      { "id": "e1", "source": "n1", "target": "n2", "type": "configurable", "data": { "conditionPath": "" } }
    ]
  }
}

## Rules
- Layout: trigger at x:300 y:200, each next node y+200, branches x±300
- Every node reachable from trigger via edges
- 3-7 nodes unless more is asked
- Vague prompt? Default to webhook → code → slack and explain it
- Question (not a workflow)? Set flow to null, answer in text
- Return ONLY the JSON object, nothing else`;

// Normalise whatever JSON shape the model returns into the exact canvas format.
// Models frequently put nodes/edges at the root level, skip "type":"custom",
// or forget the "data" wrapper — this fixes all of it.
function normalizeFlow(parsed) {
  // Find nodes + edges wherever the model put them
  const raw = parsed.flow || parsed.workflow || parsed;
  const nodes = raw.nodes || parsed.nodes || [];
  const edges = raw.edges || parsed.edges || [];

  if (!nodes.length) return null;

  const TRIGGER_TYPES = new Set([
    "manual","webhook","cron_trigger","rss_trigger","imap_trigger","gmail_trigger",
    "slack_trigger","discord_trigger","telegram_trigger","github_trigger",
    "shopify_trigger","linear_trigger","notion_trigger","airtable_trigger",
    "stripe_trigger","hubspot_trigger","youtube_trigger","reddit_trigger",
    "google_calendar_trigger","price_alert_trigger","chat_trigger","form_trigger",
    "db_trigger","error_trigger",
  ]);

  const normNodes = nodes.map((n, i) => {
    // backendType might be at root or inside data
    const bt = n.backendType || n.data?.backendType || n.type || "manual";
    const isTrigger = TRIGGER_TYPES.has(bt) || n.data?.type === "trigger";
    const label = n.label || n.data?.label || n.name || bt;
    const pos   = n.position || { x: 300, y: 200 + i * 200 };

    return {
      id:       n.id || `n${i + 1}`,
      type:     "custom",            // ReactFlow always needs type:"custom"
      position: { x: pos.x ?? 300, y: pos.y ?? 200 + i * 200 },
      data: {
        label:       label,
        backendType: bt,
        type:        isTrigger ? "trigger" : "action",
        config:      n.config || n.data?.config || {},
      },
    };
  });

  const normEdges = edges.map((e, i) => ({
    id:     e.id || `e${i + 1}`,
    source: e.source || e.from || "",
    target: e.target || e.to   || "",
    type:   "configurable",
    data:   { conditionPath: e.conditionPath || e.data?.conditionPath || "" },
    style:  {},
  })).filter(e => e.source && e.target);

  // If model forgot edges, auto-wire nodes in sequence
  if (!normEdges.length && normNodes.length > 1) {
    for (let i = 0; i < normNodes.length - 1; i++) {
      normEdges.push({
        id: `e${i + 1}`, source: normNodes[i].id, target: normNodes[i + 1].id,
        type: "configurable", data: { conditionPath: "" }, style: {},
      });
    }
  }

  return { nodes: normNodes, edges: normEdges };
}

export async function brianChat(req, res) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      message: "Brian needs a free Groq API key. Go to console.groq.com → API Keys → Create Key → add GROQ_API_KEY to Railway Variables. Takes 60 seconds.",
    });
  }

  const { messages = [] } = req.body;
  if (!messages.length) return res.status(400).json({ message: "messages array is required." });

  const lastMsg  = messages[messages.length - 1];
  const userText = (lastMsg?.content || lastMsg?.text || "").trim();
  if (!userText) return res.status(400).json({ message: "Empty message." });

  // Build OpenAI-style history (strip leading model turns — Groq requires user first)
  let history = messages.slice(0, -1).map(m => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content || m.text || " ",
  }));
  const firstUser = history.findIndex(m => m.role === "user");
  history = firstUser > 0 ? history.slice(firstUser) : firstUser === -1 ? [] : history;

  // Retry up to 2× on 429 with backoff
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let lastErr;

  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) {
      console.log(`[Brian] rate-limited — retry ${attempt}/2 in ${attempt * 2}s`);
      await sleep(attempt * 2000);
    }

    try {
      const response = await axios.post(
        GROQ_URL,
        {
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history,
            { role: "user", content: userText },
          ],
          temperature:     0.3,
          max_tokens:      4096,
          response_format: { type: "json_object" }, // Groq JSON mode — always valid JSON
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          timeout: 25000,
        },
      );

      const raw = response.data.choices[0].message.content;
      console.log("[Brian] raw output:", raw.slice(0, 400));

      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { return res.json({ text: raw, flow: null }); }

      return res.json({ text: parsed.text || "", flow: normalizeFlow(parsed) });
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if (status !== 429) break; // only retry on rate-limit
    }
  }

  // Handle errors
  const status  = lastErr?.response?.status;
  const errBody = lastErr?.response?.data?.error?.message || lastErr?.message || "Unknown error";
  console.error("[Brian] error:", status, errBody);

  if (status === 401) return res.status(503).json({ message: "GROQ_API_KEY is invalid. Check Railway → Variables." });
  if (status === 429) return res.status(429).json({ message: "Groq rate limit hit. Try again in a moment." });
  if (lastErr?.code === "ECONNABORTED") return res.status(504).json({ message: "Brian timed out. Try a simpler prompt." });

  res.status(500).json({ message: `Brian error: ${errBody}` });
}
