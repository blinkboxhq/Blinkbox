/**
 * AGENT TOOL NODES — Backend Implementations
 *
 * Each export follows the cursor.executor.js tool pattern:
 *   { toolDefinition: { name, description, parameters }, run(config, args, ctx) }
 *
 * The executor at lines 258-268 of cursor.executor.js:
 *   const toolHandler = nodeRegistry[toolType]
 *   if (toolHandler?.toolDefinition) -> wraps into LLM-callable tool
 *   else -> calls toolHandler.run() directly
 */

import axios from "axios";
import crypto from "crypto";
import { execute as containerExecute, executeCustom as containerExecuteCustom } from "../infra/container.pool.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";

function assertSafeUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error(`Invalid URL: "${rawUrl}"`); }
  const h = parsed.hostname.toLowerCase();
  const blocked = [
    /^localhost$/, /^127\./, /^0\.0\.0\.0$/, /^::1$/,
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^169\.254\./,
    /^fc00:/i, /^fe80:/i, /^fd[0-9a-f]{2}:/i, /^0\b/,
  ];
  if (blocked.some((re) => re.test(h)))
    throw new Error(`Requests to internal addresses are not allowed (${h})`);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error(`Only http/https protocols are allowed`);
}

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function td(name, description, properties = {}, required = []) {
  return {
    name,
    description,
    parameters: { type: "object", properties, required },
  };
}

async function safeExec(cmd, timeoutMs = 10000) {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 4,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (err) {
    return { stdout: "", stderr: err.message, exitCode: err.code };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH & INFORMATION
// ─────────────────────────────────────────────────────────────────────────────

export const tool_tavily = {
  toolDefinition: td(
    "tool_tavily",
    "Search the web using Tavily AI search API for real-time information",
    {
      query: { type: "string", description: "Search query" },
      max_results: { type: "number", description: "Number of results (default 5)" },
    },
    ["query"]
  ),
  async run(config, args, ctx) {
    const apiKey = config.apiKey || process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("[tool_tavily] No API key configured");
    const resp = await axios.post(
      "https://api.tavily.com/search",
      { query: args.query, max_results: args.max_results || 5 },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 }
    );
    return resp.data;
  },
};

export const tool_google_search = {
  toolDefinition: td(
    "tool_google_search",
    "Search Google via Custom Search API",
    {
      query: { type: "string", description: "Search query" },
      num: { type: "number", description: "Number of results (1-10)" },
    },
    ["query"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.GOOGLE_SEARCH_API_KEY;
    const cx = config.searchEngineId || process.env.GOOGLE_SEARCH_ENGINE_ID;
    if (!key || !cx) throw new Error("[tool_google_search] API key and Search Engine ID required");
    const resp = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: { key, cx, q: args.query, num: Math.min(args.num || 5, 10) },
      timeout: 10000,
    });
    return {
      results: resp.data.items?.map((i) => ({
        title: i.title,
        link: i.link,
        snippet: i.snippet,
      })) || [],
    };
  },
};

export const tool_news = {
  toolDefinition: td(
    "tool_news",
    "Fetch latest news articles by topic using NewsAPI",
    {
      query: { type: "string", description: "Topic or keyword" },
      language: { type: "string", description: "Language code (en, es, fr...)" },
    },
    ["query"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.NEWS_API_KEY;
    if (!key) throw new Error("[tool_news] NewsAPI key required");
    const resp = await axios.get("https://newsapi.org/v2/everything", {
      params: { q: args.query, language: args.language || "en", pageSize: 5, apiKey: key },
      timeout: 10000,
    });
    return {
      articles: resp.data.articles?.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source?.name,
        publishedAt: a.publishedAt,
        description: a.description,
      })) || [],
    };
  },
};

export const tool_translate = {
  toolDefinition: td(
    "tool_translate",
    "Translate text to another language using LibreTranslate",
    {
      text: { type: "string", description: "Text to translate" },
      source: { type: "string", description: "Source language code (auto for auto-detect)" },
      target: { type: "string", description: "Target language code (e.g. es, fr, de)" },
    },
    ["text", "target"]
  ),
  async run(config, args) {
    const url = config.libreTranslateUrl || process.env.LIBRETRANSLATE_URL || "https://libretranslate.com";
    const resp = await axios.post(
      `${url}/translate`,
      {
        q: args.text,
        source: args.source || "auto",
        target: args.target,
        api_key: config.apiKey || process.env.LIBRETRANSLATE_API_KEY || "",
      },
      { timeout: 15000 }
    );
    return { translatedText: resp.data.translatedText, detectedLanguage: resp.data.detectedLanguage };
  },
};

export const tool_http_request = {
  toolDefinition: td(
    "tool_http_request",
    "Make any HTTP/HTTPS request to an external API or URL",
    {
      url: { type: "string", description: "Request URL" },
      method: { type: "string", description: "HTTP method (GET, POST, PUT, DELETE, PATCH)" },
      headers: { type: "object", description: "Request headers as key-value pairs" },
      body: { type: "object", description: "Request body (for POST/PUT/PATCH)" },
      params: { type: "object", description: "URL query parameters" },
    },
    ["url"]
  ),
  async run(config, args) {
    const resp = await axios({
      method: args.method || "GET",
      url: args.url,
      headers: args.headers || {},
      params: args.params,
      data: args.body,
      timeout: 30000,
    });
    return { status: resp.status, headers: resp.headers, data: resp.data };
  },
};

export const tool_scraper = {
  toolDefinition: td(
    "tool_scraper",
    "Scrape text content from a web page URL",
    {
      url: { type: "string", description: "URL to scrape" },
      selector: { type: "string", description: "CSS selector to extract specific content" },
    },
    ["url"]
  ),
  async run(config, args) {
    const resp = await axios.get(args.url, {
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Blinkbox/1.0)" },
    });
    let html = resp.data;
    // Strip tags and scripts naively for text extraction
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
    return { url: args.url, text, length: text.length };
  },
};

export const tool_email = {
  toolDefinition: td(
    "tool_email",
    "Send an email via SMTP",
    {
      to: { type: "string", description: "Recipient email address" },
      subject: { type: "string", description: "Email subject" },
      body: { type: "string", description: "Email body (HTML or plain text)" },
      from: { type: "string", description: "Sender email address" },
    },
    ["to", "subject", "body"]
  ),
  async run(config, args) {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: config.smtpHost || process.env.SMTP_HOST,
      port: parseInt(config.smtpPort || process.env.SMTP_PORT || "587"),
      secure: config.smtpSecure === "true" || process.env.SMTP_SECURE === "true",
      auth: {
        user: config.smtpUser || process.env.SMTP_USER,
        pass: config.smtpPass || process.env.SMTP_PASS,
      },
    });
    const info = await transporter.sendMail({
      from: args.from || config.smtpUser || process.env.SMTP_USER,
      to: args.to,
      subject: args.subject,
      html: args.body,
    });
    return { messageId: info.messageId, accepted: info.accepted };
  },
};

export const tool_slack = {
  toolDefinition: td(
    "tool_slack",
    "Send a message to a Slack channel via webhook",
    {
      message: { type: "string", description: "Message text to send" },
      channel: { type: "string", description: "Channel name (optional, uses webhook default)" },
    },
    ["message"]
  ),
  async run(config, args) {
    const webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("[tool_slack] Slack webhook URL required");
    const payload = { text: args.message };
    if (args.channel) payload.channel = args.channel;
    const resp = await axios.post(webhookUrl, payload, { timeout: 8000 });
    return { success: resp.data === "ok", response: resp.data };
  },
};

export const tool_discord = {
  toolDefinition: td(
    "tool_discord",
    "Send a message to a Discord channel via webhook",
    {
      content: { type: "string", description: "Message to send" },
      username: { type: "string", description: "Bot username to display" },
    },
    ["content"]
  ),
  async run(config, args) {
    const webhookUrl = config.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("[tool_discord] Discord webhook URL required");
    const resp = await axios.post(webhookUrl, {
      content: args.content,
      username: args.username || "Blinkbox Agent",
    }, { timeout: 8000 });
    return { success: true, status: resp.status };
  },
};

export const tool_telegram = {
  toolDefinition: td(
    "tool_telegram",
    "Send a Telegram message via Bot API",
    {
      chatId: { type: "string", description: "Telegram chat ID or @username" },
      text: { type: "string", description: "Message text" },
    },
    ["chatId", "text"]
  ),
  async run(config, args) {
    const token = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("[tool_telegram] Telegram bot token required");
    const resp = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      { chat_id: args.chatId, text: args.text, parse_mode: "HTML" },
      { timeout: 8000 }
    );
    return resp.data;
  },
};

export const tool_webhook = {
  toolDefinition: td(
    "tool_webhook",
    "Send data to a webhook URL via POST",
    {
      url: { type: "string", description: "Webhook endpoint URL" },
      payload: { type: "object", description: "JSON payload to send" },
      headers: { type: "object", description: "Additional HTTP headers" },
    },
    ["url", "payload"]
  ),
  async run(config, args) {
    const resp = await axios.post(args.url, args.payload, {
      headers: { "Content-Type": "application/json", ...(args.headers || {}) },
      timeout: 15000,
    });
    return { status: resp.status, data: resp.data };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA & FILE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

const SAFE_FILE_ROOT = "/tmp/blinkbox";

function assertSafePath(rawPath) {
  const resolved = path.resolve(rawPath);
  if (!resolved.startsWith(SAFE_FILE_ROOT + "/") && resolved !== SAFE_FILE_ROOT) {
    throw new Error(`File access denied: paths must be under ${SAFE_FILE_ROOT}/. Got: "${resolved}"`);
  }
}

export const tool_file_read = {
  toolDefinition: td(
    "tool_file_read",
    `Read a file from the filesystem (restricted to ${SAFE_FILE_ROOT}/)`,
    {
      path: { type: "string", description: `File path under ${SAFE_FILE_ROOT}/` },
      encoding: { type: "string", description: "File encoding (utf8 default, base64, hex)" },
    },
    ["path"]
  ),
  async run(config, args) {
    assertSafePath(args.path);
    const content = await fs.readFile(args.path, args.encoding || "utf8");
    const stats = await fs.stat(args.path);
    return {
      path: args.path,
      content: typeof content === "string" ? content.slice(0, 50000) : content,
      size: stats.size,
      modified: stats.mtime,
    };
  },
};

export const tool_file_write = {
  toolDefinition: td(
    "tool_file_write",
    `Write content to a file on the filesystem (restricted to ${SAFE_FILE_ROOT}/)`,
    {
      path: { type: "string", description: `File path under ${SAFE_FILE_ROOT}/` },
      content: { type: "string", description: "Content to write" },
      append: { type: "boolean", description: "Append to file instead of overwriting" },
    },
    ["path", "content"]
  ),
  async run(config, args) {
    assertSafePath(args.path);
    if (args.append) {
      await fs.appendFile(args.path, args.content, "utf8");
    } else {
      await fs.mkdir(path.dirname(args.path), { recursive: true });
      await fs.writeFile(args.path, args.content, "utf8");
    }
    const stats = await fs.stat(args.path);
    return { path: args.path, size: stats.size, success: true };
  },
};

export const tool_csv = {
  toolDefinition: td(
    "tool_csv",
    "Parse CSV text into structured JSON data",
    {
      csv: { type: "string", description: "CSV text to parse" },
      delimiter: { type: "string", description: "Field delimiter (default comma)" },
      hasHeader: { type: "boolean", description: "First row is header (default true)" },
    },
    ["csv"]
  ),
  async run(config, args) {
    const delimiter = args.delimiter || ",";
    const lines = args.csv.trim().split("\n").map((l) => l.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, "")));
    if (args.hasHeader !== false && lines.length > 1) {
      const [headers, ...rows] = lines;
      return {
        headers,
        rows: rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]]))),
        count: rows.length,
      };
    }
    return { rows: lines, count: lines.length };
  },
};

export const tool_json = {
  toolDefinition: td(
    "tool_json",
    "Parse, validate, format, or query JSON data with a JSONPath expression",
    {
      data: { type: "string", description: "JSON string or object" },
      path: { type: "string", description: "JSONPath expression (e.g. $.users[0].name)" },
      format: { type: "boolean", description: "Pretty-print the JSON" },
    },
    ["data"]
  ),
  async run(config, args) {
    const parsed = typeof args.data === "string" ? JSON.parse(args.data) : args.data;
    if (!args.path) {
      return { parsed, formatted: args.format ? JSON.stringify(parsed, null, 2) : undefined };
    }
    const keys = args.path.replace(/^\$\.?/, "").split(/\.|\[(\d+)\]/).filter(Boolean);
    let current = parsed;
    for (const key of keys) {
      current = current?.[isNaN(key) ? key : parseInt(key)];
    }
    return { path: args.path, value: current };
  },
};

export const tool_pdf = {
  toolDefinition: td(
    "tool_pdf",
    "Extract text from a PDF file or URL",
    {
      source: { type: "string", description: "File path or URL to the PDF" },
    },
    ["source"]
  ),
  async run(config, args) {
    let pdfParse;
    try {
      pdfParse = (await import("pdf-parse")).default;
    } catch {
      throw new Error("[tool_pdf] pdf-parse package not installed");
    }
    let buffer;
    if (args.source.startsWith("http")) {
      const resp = await axios.get(args.source, { responseType: "arraybuffer", timeout: 30000 });
      buffer = Buffer.from(resp.data);
    } else {
      assertSafePath(args.source);
      buffer = await fs.readFile(args.source);
    }
    const data = await pdfParse(buffer);
    return { text: data.text.slice(0, 50000), pages: data.numpages, info: data.info };
  },
};

export const tool_excel = {
  toolDefinition: td(
    "tool_excel",
    "Read data from an Excel file (.xlsx)",
    {
      path: { type: "string", description: "Path to Excel file" },
      sheet: { type: "string", description: "Sheet name (defaults to first sheet)" },
    },
    ["path"]
  ),
  async run(config, args) {
    assertSafePath(args.path);
    let xlsx;
    try {
      xlsx = await import("xlsx");
    } catch {
      throw new Error("[tool_excel] xlsx package not installed. Run: npm i xlsx");
    }
    const workbook = xlsx.readFile(args.path);
    const sheetName = args.sheet || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    return { sheet: sheetName, rows: data, count: data.length };
  },
};

export const tool_ocr = {
  toolDefinition: td(
    "tool_ocr",
    "Extract text from an image using OCR",
    {
      imagePath: { type: "string", description: "Path or URL to the image file" },
      language: { type: "string", description: "Language code (eng default)" },
    },
    ["imagePath"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.OCR_SPACE_API_KEY;
    if (!key) throw new Error("[tool_ocr] OCR.Space API key required (free at ocr.space)");
    const formData = new URLSearchParams({
      apikey: key,
      url: args.imagePath.startsWith("http") ? args.imagePath : "",
      language: args.language || "eng",
      isOverlayRequired: "false",
    });
    const resp = await axios.post("https://api.ocr.space/parse/image", formData, { timeout: 30000 });
    const text = resp.data?.ParsedResults?.[0]?.ParsedText || "";
    return { text, exitCode: resp.data?.OCRExitCode };
  },
};

export const tool_js = {
  toolDefinition: td(
    "tool_js",
    "Execute JavaScript code in a sandboxed environment",
    {
      code: { type: "string", description: "JavaScript code to execute" },
      input: { type: "object", description: "Data available as 'input' variable in the sandbox" },
    },
    ["code"]
  ),
  async run(config, args) {
    let ivm;
    try {
      ivm = (await import("isolated-vm")).default;
    } catch {
      throw new Error("[tool_js] isolated-vm not available");
    }
    const isolate = new ivm.Isolate({ memoryLimit: 64 });
    const context = await isolate.createContext();
    await context.global.set("input", new ivm.ExternalCopy(args.input || {}).copyInto());
    const script = await isolate.compileScript(`
      let __result;
      try { __result = (function() { ${args.code} })(); } catch(e) { __result = { error: e.message }; }
      JSON.stringify(__result);
    `);
    const result = await script.run(context, { timeout: 5000 });
    return { result: JSON.parse(result || "null") };
  },
};


export const tool_bash = {
  toolDefinition: td(
    "tool_bash",
    "Run a bash/shell command in an isolated sandbox (no network, no host filesystem access)",
    {
      command: { type: "string", description: "Shell command to execute" },
      timeout: { type: "number", description: "Timeout in seconds (default 15, max 300)" },
    },
    ["command"]
  ),
  async run(config, args, context = {}) {
    return containerExecute(
      { language: "bash", command: args.command, timeoutSeconds: args.timeout || 15 },
      context.workspaceId || "default"
    );
  },
};

export const tool_virtual_computer = {
  toolDefinition: td(
    "tool_virtual_computer",
    `Full 1280×800 browser you control like a human. Powered by Puppeteer.

━━ MANDATORY WORKFLOW ━━
1. screenshot — ALWAYS start here. Look at the image before every action.
2. Identify the element: read its EXACT pixel coordinates from the screenshot.
3. Act with real coordinates or label — never invent positions.
4. screenshot again — confirm the result before continuing.
5. Repeat until done. Screenshots are your proof. Guessing is forbidden.

━━ COORDINATE ACTIONS (use pixel x,y from screenshot) ━━
- screenshot          — capture the screen (do this constantly)
- open_url            — navigate to a URL; waits for page to settle
- left_click          — left-click at (x, y)
- right_click         — right-click at (x, y)
- double_click        — double-click at (x, y)
- mouse_move          — move cursor to (x, y)
- scroll              — scroll at (x, y), direction up/down, amount 1-20

━━ KEYBOARD ACTIONS ━━
- type                — type text at current focus (click the field first!)
- key                 — press a key: Return, Tab, Escape, BackSpace, ctrl+a, ctrl+v, ctrl+l, etc.

━━ SMART FORM ACTIONS (no coordinates needed) ━━
- fill_field          — find a form field by its label/placeholder/name and fill it in one step
                        e.g. label="Email", value="user@example.com"
                        PREFERRED for forms — more reliable than click+type

━━ PAGE READING ACTIONS ━━
- get_text            — get all visible text from the page (or a CSS selector)
- get_html            — get the raw HTML (use to find selectors when stuck)
- evaluate            — run JavaScript in the page; returns result as text

━━ ADVANCED ━━
- wait_for_selector   — wait until a CSS selector appears (ms timeout, default 5000)
- hover               — hover over a CSS selector
- select_dropdown     — choose an option from a <select> by CSS selector + value
- navigate            — browser navigation: "back", "forward", "reload"
- close               — destroy this browser session`,
    {
      action:    { type: "string",  description: "Action name (see list above). Required." },
      sessionId: { type: "string",  description: "Optional. Omit to share the session across the whole workflow run." },
      url:       { type: "string",  description: "URL to navigate to (open_url)" },
      x:         { type: "number",  description: "Pixel X coordinate" },
      y:         { type: "number",  description: "Pixel Y coordinate" },
      text:      { type: "string",  description: "Text to type (type), JS to run (evaluate/run_command), or key name (key)" },
      key:       { type: "string",  description: "Key name: Return, Tab, Escape, BackSpace, ctrl+a, ctrl+v, ctrl+l, ctrl+r, etc." },
      direction: { type: "string",  description: "Scroll direction: 'up' or 'down'" },
      amount:    { type: "number",  description: "Scroll steps 1-20 (default 3)" },
      label:     { type: "string",  description: "Field label/placeholder/name for fill_field action" },
      value:     { type: "string",  description: "Value to fill into the field (fill_field action)" },
      selector:  { type: "string",  description: "CSS selector for get_html, get_text, hover, select_dropdown, wait_for_selector" },
      ms:        { type: "number",  description: "Milliseconds to wait (wait action) or timeout for wait_for_selector" },
    },
    ["action"]
  ),
  async run(config, args, ctx) {
    if (args.url) assertSafeUrl(args.url);
    const sid = args.sessionId || ctx?.executionId || `_vc_${Date.now()}`;
    const wid = ctx?.workspaceId || "default";
    return _vcDispatch(sid, wid, args.action, args);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DATABASES
// ─────────────────────────────────────────────────────────────────────────────

export const tool_sql = {
  toolDefinition: td(
    "tool_sql",
    "Execute a SQL query on a PostgreSQL database",
    {
      query: { type: "string", description: "SQL query to execute" },
      params: { type: "array", description: "Query parameters for prepared statement" },
    },
    ["query"]
  ),
  async run(config, args) {
    const { Pool } = (await import("pg")).default || (await import("pg"));
    const pool = new Pool({
      connectionString: config.connectionString || process.env.POSTGRES_URL,
      ssl: config.ssl === "true" ? { rejectUnauthorized: false } : undefined,
    });
    try {
      const result = await pool.query(args.query, args.params || []);
      return { rows: result.rows, rowCount: result.rowCount, command: result.command };
    } finally {
      await pool.end();
    }
  },
};

export const tool_mongodb = {
  toolDefinition: td(
    "tool_mongodb",
    "Query or insert documents in MongoDB",
    {
      operation: { type: "string", description: "Operation: find, insertOne, insertMany, updateOne, deleteOne, aggregate" },
      collection: { type: "string", description: "Collection name" },
      filter: { type: "object", description: "Query filter/document" },
      update: { type: "object", description: "Update operators for updateOne" },
      options: { type: "object", description: "Additional options" },
    },
    ["operation", "collection"]
  ),
  async run(config, args) {
    const mongoose = (await import("mongoose")).default;
    const uri = config.uri || process.env.MONGODB_URI;
    if (!uri) throw new Error("[tool_mongodb] MongoDB URI required");
    const conn = await mongoose.createConnection(uri).asPromise();
    try {
      const col = conn.collection(args.collection);
      switch (args.operation) {
        case "find": return { results: await col.find(args.filter || {}).limit(args.options?.limit || 50).toArray() };
        case "insertOne": return await col.insertOne(args.filter || {});
        case "insertMany": return await col.insertMany(Array.isArray(args.filter) ? args.filter : [args.filter]);
        case "updateOne": return await col.updateOne(args.filter || {}, args.update || {});
        case "deleteOne": return await col.deleteOne(args.filter || {});
        case "aggregate": return { results: await col.aggregate(args.filter || []).toArray() };
        default: throw new Error(`Unknown operation: ${args.operation}`);
      }
    } finally {
      await conn.close();
    }
  },
};

export const tool_memory_store = {
  toolDefinition: td(
    "tool_memory_store",
    "Store and retrieve values in the agent's persistent memory for this workflow run",
    {
      operation: { type: "string", description: "get, set, delete, list" },
      key: { type: "string", description: "Memory key" },
      value: { type: "string", description: "Value to store (for set)" },
    },
    ["operation"]
  ),
  async run(config, args, ctx) {
    const { redis } = await import("../infra/redis.client.js");
    const scope = `agent_memory:${ctx?.workflowId || "global"}`;
    switch (args.operation) {
      case "get": return { key: args.key, value: await redis.hget(scope, args.key) };
      case "set": {
        await redis.hset(scope, args.key, typeof args.value === "string" ? args.value : JSON.stringify(args.value));
        await redis.expire(scope, 86400 * 7);
        return { success: true };
      }
      case "delete": return { deleted: await redis.hdel(scope, args.key) };
      case "list": return { keys: await redis.hkeys(scope) };
      default: throw new Error(`Unknown memory operation: ${args.operation}`);
    }
  },
};

export const tool_think = {
  toolDefinition: td(
    "tool_think",
    "Use this to think through a problem step-by-step before taking action. The thought is not shown to the user.",
    {
      thought: { type: "string", description: "Your internal reasoning and thinking process" },
    },
    ["thought"]
  ),
  async run(config, args) {
    return { thought: args.thought, status: "thought_recorded" };
  },
};

export const tool_calendar = {
  toolDefinition: td(
    "tool_calendar",
    "Create or list events in Google Calendar",
    {
      operation: { type: "string", description: "list or create" },
      summary: { type: "string", description: "Event title (for create)" },
      start: { type: "string", description: "Start datetime ISO string" },
      end: { type: "string", description: "End datetime ISO string" },
      calendarId: { type: "string", description: "Calendar ID (default: primary)" },
    },
    ["operation"]
  ),
  async run(config, args) {
    const token = config.accessToken || process.env.GOOGLE_ACCESS_TOKEN;
    if (!token) throw new Error("[tool_calendar] Google access token required");
    const calId = args.calendarId || "primary";
    if (args.operation === "list") {
      const resp = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { timeMin: new Date().toISOString(), maxResults: 10, singleEvents: true, orderBy: "startTime" },
        timeout: 10000,
      });
      return { events: resp.data.items };
    }
    const resp = await axios.post(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
      { summary: args.summary, start: { dateTime: args.start }, end: { dateTime: args.end } },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );
    return { id: resp.data.id, htmlLink: resp.data.htmlLink };
  },
};

export const tool_call_workflow = {
  toolDefinition: td(
    "tool_call_workflow",
    "Trigger another Blinkbox workflow by ID and optionally wait for the result",
    {
      workflowId: { type: "string", description: "ID of the workflow to trigger" },
      payload: { type: "object", description: "Input payload for the workflow" },
      waitForResult: { type: "boolean", description: "Wait for workflow to complete (default false)" },
    },
    ["workflowId"]
  ),
  async run(config, args, ctx) {
    const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
    const resp = await axios.post(
      `${baseUrl}/api/workflows/${args.workflowId}/trigger`,
      { payload: args.payload || {} },
      { headers: { Authorization: `Bearer ${ctx?.token || ""}` }, timeout: 10000 }
    );
    return { triggered: true, executionId: resp.data?.executionId };
  },
};

export const tool_mcp_client = {
  toolDefinition: td(
    "tool_mcp_client",
    "Call a tool on an external MCP (Model Context Protocol) server",
    {
      serverUrl: { type: "string", description: "MCP server URL" },
      toolName: { type: "string", description: "Name of the MCP tool to call" },
      arguments: { type: "object", description: "Arguments to pass to the MCP tool" },
    },
    ["serverUrl", "toolName"]
  ),
  async run(config, args) {
    const resp = await axios.post(
      `${args.serverUrl}/tools/call`,
      { name: args.toolName, arguments: args.arguments || {} },
      { headers: { "Content-Type": "application/json" }, timeout: 30000 }
    );
    return resp.data;
  },
};

