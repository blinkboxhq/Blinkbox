import { GoogleGenerativeAI } from "@google/generative-ai";

// gemini-2.0-flash: free on AI Studio, excellent structured JSON output.
// Override with BRIAN_MODEL env var once Gemma 4 appears in AI Studio's model list.
const MODEL = process.env.BRIAN_MODEL || "gemini-2.0-flash";

const SYSTEM_PROMPT = `You are Brian, an AI workflow builder inside BlinkBox — an automation platform like Zapier and Make.

Your ONLY job: read the user's request and return a single JSON object describing a workflow.

## Available node backendType values

TRIGGER nodes (type: "trigger") — always exactly one, always first:
  manual, webhook, cron_trigger, rss_trigger, imap_trigger, gmail_trigger,
  slack_trigger, discord_trigger, telegram_trigger, github_trigger,
  shopify_trigger, linear_trigger, notion_trigger, airtable_trigger,
  stripe_trigger, hubspot_trigger, youtube_trigger, reddit_trigger,
  google_calendar_trigger, price_alert_trigger, chat_trigger, form_trigger,
  db_trigger, error_trigger

ACTION nodes (type: "action"):
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

## Required output schema — return ONLY this JSON, no markdown fences, no extra text

{
  "text": "1-3 sentence explanation of what this workflow does",
  "flow": {
    "nodes": [
      {
        "id": "n1",
        "type": "custom",
        "position": { "x": 300, "y": 200 },
        "data": {
          "label": "Human readable name",
          "backendType": "webhook",
          "type": "trigger",
          "config": {}
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "n1",
        "target": "n2",
        "type": "configurable",
        "data": { "conditionPath": "" }
      }
    ]
  }
}

## Layout rules
- Trigger node: x=300 y=200
- Each subsequent node: same x=300, y increases by 200
- Parallel branches: offset x by ±300 from main path

## Hard rules
- Exactly ONE trigger node, always the first node
- Every node must be reachable from the trigger via edges
- Use ONLY backendType values from the list above
- If the user asks a question (not a workflow request), set flow to null and answer in text
- Aim for 3-7 nodes unless complexity is explicitly requested
- NEVER output markdown. NEVER output anything except the JSON object.

## Fallback for vague prompts
If the request is too vague to map to specific services (e.g. "do something cool",
"automate stuff"), build a sensible default: webhook → code → slack, and explain in text.

## Concrete example
User: "notify Slack when a form is submitted"
Output:
{"text":"When a form is submitted, the payload is processed by a Code node then posted to Slack.","flow":{"nodes":[{"id":"n1","type":"custom","position":{"x":300,"y":200},"data":{"label":"Form Trigger","backendType":"form_trigger","type":"trigger","config":{}}},{"id":"n2","type":"custom","position":{"x":300,"y":400},"data":{"label":"Process Data","backendType":"code","type":"action","config":{}}},{"id":"n3","type":"custom","position":{"x":300,"y":600},"data":{"label":"Notify Slack","backendType":"slack","type":"action","config":{}}}],"edges":[{"id":"e1","source":"n1","target":"n2","type":"configurable","data":{"conditionPath":""}},{"id":"e2","source":"n2","target":"n3","type":"configurable","data":{"conditionPath":""}}]}}`;

// Brace-counting JSON extractor — handles nested objects correctly
function extractJSON(raw) {
  const s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  let depth = 0, start = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (s[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return JSON.parse(s.slice(start, i + 1));
      }
    }
  }
  throw new Error("No valid JSON object in model response");
}

export async function brianChat(req, res) {
  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "Brian is not configured. Add GOOGLE_AI_KEY in Railway → Variables (free at aistudio.google.com)." });
  }

  const { messages = [] } = req.body;
  if (!messages.length) return res.status(400).json({ message: "messages array is required." });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    });

    // Gemini requires history to alternate user/model and start with user.
    // Strip any leading model turns (e.g. welcome message echoed in history).
    let history = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content || " " }],
    }));
    const firstUserIdx = history.findIndex((m) => m.role === "user");
    history = firstUserIdx > 0 ? history.slice(firstUserIdx) : firstUserIdx === -1 ? [] : history;

    const lastMsg = messages[messages.length - 1];
    const userText = (lastMsg?.content || lastMsg?.text || "").trim();
    if (!userText) return res.status(400).json({ message: "Empty message." });

    // 25-second timeout — Gemini is fast but we don't want Railway to sit forever
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 25_000);

    let raw;
    try {
      const chat   = model.startChat({ history });
      const result = await chat.sendMessage(userText);
      raw = result.response.text();
    } finally {
      clearTimeout(timer);
    }

    console.log("[Brian] model output (first 400 chars):", raw?.slice(0, 400));

    let parsed;
    try {
      parsed = extractJSON(raw);
    } catch {
      // Model returned plain prose — treat as a text-only reply
      parsed = { text: raw, flow: null };
    }

    return res.json({
      text: parsed.text || "",
      flow: parsed.flow || null,
    });
  } catch (err) {
    console.error("[Brian] error:", err.message, "status:", err.status);

    if (err.name === "AbortError") {
      return res.status(504).json({ message: "Brian timed out. Try a simpler prompt." });
    }
    if (err.message?.includes("API_KEY") || err.status === 403) {
      return res.status(503).json({ message: "GOOGLE_AI_KEY is invalid. Check Railway variables." });
    }
    if (err.status === 404 || err.message?.includes("not found")) {
      return res.status(503).json({ message: `Model "${MODEL}" not found. Set BRIAN_MODEL=gemini-2.0-flash in Railway.` });
    }
    if (err.status === 429) {
      return res.status(429).json({ message: "Brian is rate-limited. Try again in a moment." });
    }

    res.status(500).json({ message: `Brian error: ${err.message}` });
  }
}
