import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = process.env.BRIAN_MODEL || "gemma-4-27b-it";

// ── System prompt — tells the model what nodes exist and what to output ────────
const SYSTEM_PROMPT = `You are Brian, an AI workflow builder inside BlinkBox — an automation platform similar to Zapier and Make.

Your job: read the user's request and return a JSON workflow they can drop onto the BlinkBox canvas.

## Available node types (backendType values)

TRIGGER nodes (always first, type: "trigger"):
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

## Output format (STRICT — return ONLY this JSON, no markdown fences)

{
  "text": "A brief explanation of what the workflow does (1-3 sentences)",
  "flow": {
    "nodes": [
      {
        "id": "n1",
        "type": "custom",
        "position": { "x": 300, "y": 200 },
        "data": {
          "label": "Human-readable node name",
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
- Start trigger at x:300, y:200
- Each next node: x stays 300, y increases by 200
- For branches: offset x by ±300

## Rules
- Always start with exactly ONE trigger node
- Every node must be reachable from the trigger via edges
- Use only backendType values from the list above
- If the user asks a question instead of requesting a workflow, set flow to null and answer in text
- Keep it simple — 3-7 nodes is ideal unless complexity is asked for
- Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

function extractJSON(raw) {
  // Strip markdown fences if model wraps it
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Find the outermost { } block
  const start = cleaned.indexOf("{");
  const end   = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in model response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function brianChat(req, res) {
  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "Brian is not configured. Add GOOGLE_AI_KEY to your environment." });
  }

  const { messages = [] } = req.body;
  if (!messages.length) return res.status(400).json({ message: "messages array is required" });

  try {
    const genAI  = new GoogleGenerativeAI(apiKey);
    const model  = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature:     0.4,   // low = more deterministic JSON
        maxOutputTokens: 4096,
        responseMimeType: "application/json", // force JSON mode where supported
      },
    });

    // Convert our message history to Gemini's format
    // Gemini uses role: "user" | "model"
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const lastMsg = messages[messages.length - 1];
    const chat    = model.startChat({ history });
    const result  = await chat.sendMessage(lastMsg.content);
    const raw     = result.response.text();

    let parsed;
    try {
      parsed = extractJSON(raw);
    } catch {
      // Model returned plain text — wrap it as a no-flow reply
      parsed = { text: raw, flow: null };
    }

    return res.json({
      text: parsed.text || "",
      flow: parsed.flow || null,
    });
  } catch (err) {
    console.error("[Brian] Gemma error:", err.message);

    // Surface quota/auth errors clearly
    if (err.message?.includes("API_KEY") || err.status === 403) {
      return res.status(403).json({ message: "Invalid GOOGLE_AI_KEY — check your environment." });
    }
    if (err.status === 429) {
      return res.status(429).json({ message: "Brian is rate-limited. Try again in a moment." });
    }

    res.status(500).json({ message: "Brian encountered an error. Try again." });
  }
}
