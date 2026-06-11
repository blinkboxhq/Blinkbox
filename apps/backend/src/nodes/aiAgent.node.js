/**
 * AI AGENT NODE — Universal ReAct Cognitive Engine
 *
 * A production-grade autonomous agent that uses a generic ReAct
 * (Reason + Act) loop to accomplish goals. Stateless per-invocation:
 * all context arrives via config, all large payloads survive Temporal's
 * 32 KB event history limit by flowing through the Vault.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  ReAct LOOP (max N iterations)                                          │
 * │                                                                          │
 * │  ① THINK  — LLM reasons about the goal, decides next action             │
 * │  ② ACT    — Execute a tool from the ToolRegistry (or respond)           │
 * │  ③ OBSERVE — Feed tool result back into conversation                    │
 * │  ④ REPEAT — Until LLM emits a final answer or budget exhausted         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Tool Resolution:
 *   Tools are NOT hardcoded. They arrive from two sources:
 *     1. Handle-routed edges  (_tools) — nodes with toolDefinition + execute closures
 *     2. Enabled tool IDs     (enabledToolIds) — resolved at runtime via ToolRegistry
 *   Both are merged into a single unified tool surface.
 *
 * Config (from frontend panel):
 *   provider               — LLM provider key
 *   model                  — Model ID (falls back to provider default)
 *   prompt                 — The user's goal / instruction
 *   systemPrompt           — Custom persona / constraints layered on top
 *   credentialId           — Vault reference to encrypted LLM API key
 *   enabledToolIds         — Array of tool IDs to resolve from ToolRegistry
 *   outputFormat           — "json" | "text"
 *   temperature            — 0-2 (default 0.3)
 *   maxTokens              — Response token limit (default 4096)
 *   maxIterations          — ReAct loop ceiling (default 5, hard max 15)
 *   returnIntermediateSteps — Include full reasoning trace in output
 *
 * Config (injected by cursor executor via handle routing):
 *   _memory                — Array of {role, content} from Memory handle
 *   _tools                 — Array of tool definitions from Tools handle
 *
 * Built-in tools:
 *   builtinWebSearch       — Toggle for Tavily web search
 *   webSearchCredentialId  — Vault ref for Tavily API key
 *
 * Output:
 *   { result, model, tokensUsed, provider, iterations, intermediateSteps?, warning? }
 */

import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";
import { redis } from "../infra/redis.client.js";
import { BRIAN_ANTHROPIC_MODEL } from "../modules/brian/brian.registry.js";
import { assertSafeUrl, assertSafeUrlResolved } from "../utils/ssrf.js";

// Platform integration nodes — imported for autonomous tool use
import _slackNode    from "./integrations/slack.node.js";
import _gmailNode    from "./integrations/gmail.node.js";
import _discordNode  from "./integrations/discord.node.js";
import _telegramNode from "./integrations/telegram.node.js";
import _notionNode   from "./integrations/notion.node.js";
import _airtableNode from "./integrations/airtable.node.js";
import _sheetsNode   from "./integrations/googleSheets.node.js";
import _githubNode   from "./integrations/github.node.js";
import _linearNode   from "./integrations/linear.node.js";
import _hubspotNode  from "./integrations/hubspot.node.js";
import _mongoNode    from "./integrations/mongodb.node.js";
import _postgresNode from "./integrations/postgres.node.js";
import _redisNode    from "./integrations/redis.node.js";
import _jiraNode     from "./integrations/jira.node.js";
import _asanaNode    from "./integrations/asana.node.js";
import _stripeNode   from "./integrations/stripe.node.js";
import _shopifyNode  from "./integrations/shopify.node.js";
import _clickupNode  from "./integrations/clickup.node.js";
import _twilioNode        from "./integrations/twilio.node.js";
import _gCalendarNode    from "./integrations/googleCalendar.node.js";
import _gDriveNode       from "./integrations/googleDrive.node.js";
import _outlookNode      from "./integrations/outlook.node.js";

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════════════════════════

const ENDPOINTS = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  together: "https://api.together.xyz/v1/chat/completions",
  perplexity: "https://api.perplexity.ai/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  nvidia_nim: "https://integrate.api.nvidia.com/v1/chat/completions",
  gemma:      "https://integrate.api.nvidia.com/v1/chat/completions",
  moonshot:   "https://api.moonshot.cn/v1/chat/completions",
  fireworks: "https://api.fireworks.ai/inference/v1/chat/completions",
  cerebras: "https://api.cerebras.ai/v1/chat/completions",
  ollama:   "http://127.0.0.1:11434/v1/chat/completions",
  lmstudio: "http://127.0.0.1:1234/v1/chat/completions",
  novita: "https://api.novita.ai/v3/openai/chat/completions",
  deepinfra: "https://api.deepinfra.com/v1/openai/chat/completions",
  hyperbolic: "https://api.hyperbolic.xyz/v1/chat/completions",
};

const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  anthropic: BRIAN_ANTHROPIC_MODEL,
  gemini: "gemini-2.0-flash",
  deepseek: "deepseek-chat",
  openrouter: "anthropic/claude-3.5-sonnet",
  together: "meta-llama/Llama-3-70b-chat-hf",
  perplexity: "llama-3-sonar-large-32k-online",
  xai: "grok-beta",
  fireworks: "accounts/fireworks/models/firefunction-v2",
  cerebras: "llama3.1-70b",
  ollama:   "llama3",
  lmstudio: "local-model",
  groq: "llama-3.3-70b-versatile",
  nvidia_nim: "nvidia/nemotron-3-ultra-550b-a55b",
  gemma:      "google/gemma-4-31b-it",
  moonshot:   "moonshot-v1-8k",
  novita: "meta-llama/llama-3-70b-instruct",
  deepinfra: "meta-llama/Meta-Llama-3-70B-Instruct",
  hyperbolic: "meta-llama/Meta-Llama-3-70B-Instruct",
};

const MAX_INPUT_BYTES = 30_000;
const MAX_ITERATIONS_CEILING = 15;
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_TOOL_OUTPUT_BYTES = 15_000;
const TOOL_TIMEOUT_MS = 30_000;
const MAX_MEMORY_MESSAGES = 200;

// ── Token Summarizer Constants ────────────────────────────────────────────────
// ~80k tokens * ~4 chars/token = 320k chars. When the messages array exceeds
// this, we compress the scratchpad before the next LLM call.
const SUMMARIZE_CHAR_THRESHOLD = 320_000;

// ═════════════════════════════════════════════════════════════════════════════
// BUILT-IN TOOL DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

const BUILTIN_TOOLS = {
  web_search: {
    name: "web_search",
    description:
      "Search the internet for current information using Tavily. " +
      "Returns titles, URLs, content snippets, and an AI-generated answer.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        searchDepth: {
          type: "string",
          enum: ["basic", "advanced"],
          description: "Search depth — basic is faster, advanced is deeper",
        },
        maxResults: {
          type: "number",
          description: "Number of results to return (1-20, default 5)",
        },
      },
      required: ["query"],
    },
  },
  calculator: {
    name: "calculator",
    description:
      "Perform mathematical calculations. Supports arithmetic, algebra, percentages, unit conversions, and financial math. Always use this for any calculation instead of doing math in your head.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description:
            "Mathematical expression to evaluate. Examples: '15% of 2500', '(1 + 0.08)^10 * 1000', 'sqrt(144) + pi * 3^2'",
        },
      },
      required: ["expression"],
    },
  },
  wikipedia: {
    name: "wikipedia",
    description:
      "Search Wikipedia for factual information about people, places, events, concepts, and history. Returns a concise summary from the Wikipedia article.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term or article title",
        },
        sentences: {
          type: "number",
          description: "Number of sentences to return (default 5, max 10)",
        },
      },
      required: ["query"],
    },
  },
  http_request: {
    name: "http_request",
    description:
      "Make an HTTP request to any public API or URL. Use for fetching live data, calling REST APIs, checking URLs, or reading web content.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL to request" },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
          description: "HTTP method (default: GET)",
        },
        headers: {
          type: "object",
          description: "Request headers as key-value pairs",
        },
        body: {
          type: "object",
          description: "Request body for POST/PUT (will be JSON-encoded)",
        },
        timeout: {
          type: "number",
          description: "Timeout in seconds (default 15, max 60)",
        },
      },
      required: ["url"],
    },
  },
  execute_js: {
    name: "execute_js",
    description:
      "Execute JavaScript code and return the result. Useful for data transformation, calculations, string manipulation, JSON processing, and algorithm implementation. Code runs in a sandboxed Node.js environment with access to standard built-ins but no file system or network access.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "JavaScript code to execute. Use 'return' to return a value, or the last expression is returned. Example: 'const data = [1,2,3]; return data.map(x => x * 2)'",
        },
        timeout: {
          type: "number",
          description: "Execution timeout in milliseconds (default 5000, max 30000)",
        },
      },
      required: ["code"],
    },
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// SAFE MATH EVALUATOR
// ═════════════════════════════════════════════════════════════════════════════
// Recursive-descent parser for arithmetic. It NEVER evaluates arbitrary code
// (no new Function / eval), so no expression can escape into the JS runtime —
// it only understands numbers, + - * / % ^, parentheses, and a fixed set of
// math functions/constants. Anything else throws.
const MATH_FUNCS = {
  sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil,
  round: Math.round, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  log: Math.log10, log10: Math.log10, ln: Math.log, log2: Math.log2,
  exp: Math.exp, sign: Math.sign, trunc: Math.trunc, cbrt: Math.cbrt,
  pow: Math.pow, min: Math.min, max: Math.max, atan2: Math.atan2,
};
const MATH_CONSTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

function evalMathExpression(input) {
  // Normalise: "20% of 50" → "(20/100)*50", "^" → "**" handled in parser.
  const src = input.replace(/(\d+(?:\.\d+)?)\s*%\s*of\s+/gi, "($1/100)*");
  const tokens = [];
  const re = /\s*([A-Za-z_]\w*|\d+\.?\d*|\.\d+|\*\*|[-+*/%(),^])/g;
  let m, last = 0;
  while ((m = re.exec(src)) !== null) {
    if (m.index !== last) throw new Error(`Unexpected character at ${last}`);
    tokens.push(m[1]);
    last = re.lastIndex;
  }
  if (last !== src.length) throw new Error("Invalid characters in expression");

  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  // Grammar (lowest → highest precedence): expr → term (('+'|'-') term)*
  function parseExpr() {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") v = next() === "+" ? v + parseTerm() : v - parseTerm();
    return v;
  }
  function parseTerm() {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = next();
      const r = parseFactor();
      v = op === "*" ? v * r : op === "/" ? v / r : v % r;
    }
    return v;
  }
  function parseFactor() {
    if (peek() === "+") { next(); return parseFactor(); }
    if (peek() === "-") { next(); return -parseFactor(); }
    let v = parsePower();
    return v;
  }
  function parsePower() {
    const base = parsePrimary();
    if (peek() === "^" || peek() === "**") { next(); return Math.pow(base, parseFactor()); }
    return base;
  }
  function parsePrimary() {
    const t = next();
    if (t === undefined) throw new Error("Unexpected end of expression");
    if (t === "(") { const v = parseExpr(); if (next() !== ")") throw new Error("Missing )"); return v; }
    if (/^[A-Za-z_]/.test(t)) {
      const name = t.toLowerCase();
      if (peek() === "(") {
        next();
        const args = [];
        if (peek() !== ")") { args.push(parseExpr()); while (peek() === ",") { next(); args.push(parseExpr()); } }
        if (next() !== ")") throw new Error("Missing ) after function args");
        const fn = MATH_FUNCS[name];
        if (!fn) throw new Error(`Unknown function "${name}"`);
        return fn(...args);
      }
      if (name in MATH_CONSTS) return MATH_CONSTS[name];
      throw new Error(`Unknown identifier "${name}"`);
    }
    const num = Number(t);
    if (Number.isNaN(num)) throw new Error(`Unexpected token "${t}"`);
    return num;
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error(`Unexpected token "${peek()}"`);
  return result;
}

// ═════════════════════════════════════════════════════════════════════════════
// ReAct SYSTEM PROMPT
// ═════════════════════════════════════════════════════════════════════════════
// A single, focused prompt that enforces the Think → Act → Observe cycle.
// The LLM receives this as its identity; the user's custom systemPrompt
// is layered on top as domain-specific constraints.

const REACT_SYSTEM_PROMPT =
  `You are an advanced ReAct (Reason + Act) agent. You solve complex problems through systematic reasoning and targeted action.\n` +
  `\n` +
  `## Your Cognitive Loop\n` +
  `For each step:\n` +
  `  THINK:   What do I know? What's missing? What's the best next action?\n` +
  `  ACT:     Call the most appropriate tool. Be precise with arguments.\n` +
  `  OBSERVE: What did I learn? Does this change my plan?\n` +
  `  REPEAT:  Until the goal is fully achieved.\n` +
  `\n` +
  `## Honesty Rules (ABSOLUTE — never break these)\n` +
  `  1. NEVER fabricate tool results. If a tool fails or returns an error, report it exactly as-is.\n` +
  `  2. NEVER claim you completed an action unless a tool confirmed it. A screenshot, API response, or success field is proof. Silence is not.\n` +
  `  3. NEVER pretend a website interaction succeeded if the screenshot shows an error, CAPTCHA, or wrong page.\n` +
  `  4. If you cannot complete the task with the tools available, say so plainly. "I was unable to complete X because Y" is a correct answer. Making up a result is not.\n` +
  `  5. Tool errors are your data — read them carefully. Do not retry the identical call more than once.\n` +
  `\n` +
  `## Rules for Excellence\n` +
  `  6. If one approach fails, pivot: try a different tool, selector, or strategy — don't repeat the same failing call.\n` +
  `  7. When multiple searches are needed, you may call them in one response — they'll run in parallel.\n` +
  `  8. Be decisive: make a plan, execute it, don't over-think simple steps.\n` +
  `  9. Final answer: when you have everything needed, respond directly without another tool call.\n` +
  `  10. Quality > Speed: a complete, accurate answer is worth the extra iteration.\n` +
  `\n` +
  `## Browser / Virtual Computer Rules (STRICT — follow exactly)\n` +
  `  - The RELIABLE loop is: open_url → read_page → click_index / click_text / fill_field → read_page → repeat. This needs NO pixel guessing.\n` +
  `  - read_page returns a NUMBERED list of every clickable element with its text and exact coordinates, e.g. [3] button "Sign in" @ (640,420). Read it, then click_index with index=3 (or click_text with the visible label).\n` +
  `  - FOR FORMS: use fill_field (label=, value=) — it finds the field by its label automatically. Do NOT guess x,y for inputs.\n` +
  `  - Call read_page again whenever the page changes (after a click, navigation, or load) — the index goes stale otherwise.\n` +
  `  - Use screenshot to SEE the page (verify state, read errors, spot a CAPTCHA). Every action also returns a screenshot — look at it before the next step.\n` +
  `  - Raw coordinate clicks (left_click x,y) are a FALLBACK only — use them when an element is not in the read_page index. The viewport is a fixed 1280×800, so screenshot pixels map 1:1 to click coordinates.\n` +
  `  - Browser state persists across calls — do NOT re-navigate between steps unless you intend to.\n` +
  `  - New tabs/popups are followed automatically. If a result includes a "dialog" field, a confirm/alert fired and was auto-accepted — account for it.\n` +
  `  - If the page shows a CAPTCHA, login wall, or anti-bot page: stop immediately and report it.\n` +
  `  - NEVER claim you filled a field or clicked a button unless the tool result confirms it. The screenshot and success field are your proof.\n` +
  `\n` +
  `## Tool Strategy\n` +
  `  - For research: search broadly first, then drill into the most relevant result\n` +
  `  - For calculations: use the calculator tool — never do arithmetic mentally\n` +
  `  - For code: write it, execute it, inspect the output before returning\n` +
  `  - For APIs: read the response carefully before extracting data\n` +
  `  - To save information between steps: use remember(key, value) — retrieve later with recall(key)\n` +
  `  - Platform integrations (Slack, Gmail, Notion, etc.): call these tools directly to take real-world action\n` +
  `\n` +
  `## Taking Real-World Action\n` +
  `  When you have platform integration tools available (slack, gmail, google_calendar, notion, etc.):\n` +
  `  - Send the Slack message / email / Discord post autonomously — don't just describe what you'd send\n` +
  `  - Write to the database / spreadsheet / Notion page as part of your response\n` +
  `  - Confirm the action in your final answer ("I sent a message to #alerts with the results...")\n` +
  `  - CRITICAL: If a tool returns { "error": true } or contains an "error" key, you MUST tell the user the exact error message. NEVER say the action succeeded when the tool returned an error. Show the user the error text verbatim so they can fix it.\n` +
  `\n` +
  `## Output Format\n` +
  `  - Write in plain, direct prose. No emojis. No excessive headers or bold text.\n` +
  `  - If the task was partially completed, explain clearly what was done and what failed.\n` +
  `  - Cite sources when you used search tools.\n` +
  `  - A short honest answer beats a long fabricated one every time.`;

// ═════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═════════════════════════════════════════════════════════════════════════════

const agentNode = {
  async run(config, input, context = {}) {
    const {
      provider: _configProvider = "openai",
      model: _configModel,
      prompt,
      systemPrompt,
      credentialId: _configCredentialId,
      _chatModel,
      enabledToolIds,
      outputFormat = "text",
      temperature = 0.3,
      maxTokens = 8192,
      maxIterations = 5,
      returnIntermediateSteps = false,

      // Handle-routed dependencies (injected by cursor executor)
      _memory,
      _tools,
      _platformTools,

      // Built-in tools (toggled from config panel)
      builtinWebSearch = false,
      webSearchCredentialId,

      // Conversation memory
      conversationMemoryEnabled = false,
      memorySessionId,
      memoryMaxMessages = 20,

      // Legacy compat — old configs may still send agentType
      agentType: _legacyAgentType,
    } = config;

    // Connected Language Model node overrides inline provider/model/credential.
    // Dedicated provider nodes (agent_anthropic, agent_openai, etc.) don't store
    // `provider` in config — derive it from the node's backendType instead.
    const BACKENDTYPE_TO_PROVIDER = {
      agent_openai: "openai", agent_anthropic: "anthropic", agent_gemini: "gemini",
      agent_xai: "xai", agent_deepseek: "deepseek", agent_groq: "groq",
      agent_perplexity: "perplexity", agent_ollama: "ollama", agent_lmstudio: "lmstudio",
      agent_nvidia_nim: "nvidia_nim", agent_gemma: "gemma",
      agent_moonshot: "moonshot", agent_novita: "novita", agent_deepinfra: "deepinfra",
      agent_hyperbolic: "hyperbolic", agent_fireworks: "fireworks", agent_cerebras: "cerebras",
      agent_together: "together", agent_openrouter: "openrouter",
    };
    const _llm = _chatModel?.config || _chatModel;
    const _derivedProvider = _chatModel?.backendType ? BACKENDTYPE_TO_PROVIDER[_chatModel.backendType] : null;
    const provider = _llm?.provider || _derivedProvider || _configProvider;
    const model = _llm?.customModel?.trim() || _llm?.model || _configModel;
    const credentialId = _llm?.credentialId || _configCredentialId;

    // ── Validation ─────────────────────────────────────────────────────
    if (!prompt) {
      throw new Error(
        "AI Agent: 'prompt' is required. Add an instruction in the Instructions field."
      );
    }
    if (!ENDPOINTS[provider]) {
      throw new Error(
        `AI Agent: Unknown provider "${provider}". Supported: ${Object.keys(ENDPOINTS).join(", ")}`
      );
    }

    const resolvedModel = model || DEFAULT_MODELS[provider];

    // ── Resolve LLM Credential ─────────────────────────────────────────
    const PROVIDER_ENV_KEYS = {
      openai:      "OPENAI_API_KEY",
      anthropic:   "ANTHROPIC_API_KEY",
      gemini:      "GEMINI_API_KEY",
      deepseek:    "DEEPSEEK_API_KEY",
      openrouter:  "OPENROUTER_API_KEY",
      together:    "TOGETHER_API_KEY",
      perplexity:  "PERPLEXITY_API_KEY",
      xai:         "XAI_API_KEY",
      fireworks:   "FIREWORKS_API_KEY",
      cerebras:    "CEREBRAS_API_KEY",
      groq:        "GROQ_API_KEY",
      nvidia_nim:  "NVIDIA_NIM_API_KEY",
      gemma:       "NVIDIA_NIM_API_KEY",
      moonshot:    "MOONSHOT_API_KEY",
      novita:      "NOVITA_API_KEY",
      deepinfra:   "DEEPINFRA_API_KEY",
      hyperbolic:  "HYPERBOLIC_API_KEY",
    };

    const LOCAL_PROVIDERS = new Set(["ollama", "lmstudio"]);

    let apiKey;
    if (credentialId) {
      const cred = await resolveCredential(credentialId, context.workspaceId, "AI Agent");
      apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    } else if (!LOCAL_PROVIDERS.has(provider)) {
      const envKey = PROVIDER_ENV_KEYS[provider];
      apiKey = envKey ? process.env[envKey] : null;
      if (!apiKey) {
        throw new Error(
          `AI Agent: No API key configured for "${provider}". Add a credential in the node settings or set ${envKey || "the provider API key"} on the server.`
        );
      }
    }

    // Local providers support a configurable base URL from the satellite node
    // config. Pass it per-call (see callProvider) — do NOT mutate ENDPOINTS,
    // which is shared across all concurrent executions.
    const providerBaseUrl = LOCAL_PROVIDERS.has(provider) ? _llm?.baseUrl : undefined;

    // ── Conversation Memory — load from Redis ─────────────────────
    const memKey = conversationMemoryEnabled && memorySessionId
      ? `bb:conv:${context.workspaceId}:${String(memorySessionId).slice(0, 200)}`
      : null;

    let conversationHistory = [];
    if (memKey) {
      try {
        const stored = await redis.get(memKey);
        if (stored) {
          conversationHistory = JSON.parse(stored);
          const cap = memoryMaxMessages * 2;
          if (conversationHistory.length > cap) {
            conversationHistory = conversationHistory.slice(-cap);
          }
        }
      } catch {
        conversationHistory = [];
      }
    }

    // ── Assemble Tool Surface ──────────────────────────────────────────
    // Three sources merged into one flat array:
    //   1. Handle-routed tools (_tools from connected nodes)
    //   2. Registry-resolved tools (enabledToolIds from config panel)
    //   3. Built-in tools (web_search if toggled on)

    // ── Extract all attachments before tool assembly so tools can forward them ─
    const inputAttachments =
      (Array.isArray(input?.attachments) && input.attachments) ||
      (Array.isArray(input?.body?.attachments) && input.body.attachments) ||
      [];

    const tools = await assembleTools({
      handleTools: _tools,
      enabledToolIds,
      builtinWebSearch,
      webSearchCredentialId,
      workspaceId: context.workspaceId,
      toolRegistry: context.toolRegistry || null,
      platformTools: [...(config.platformTools || []), ...(_platformTools || [])],
      inputAttachments,
    });

    const formattedTools =
      tools.length > 0 ? formatToolsForProvider(tools, provider) : null;

    // ── Resolve Memory ─────────────────────────────────────────────────
    const memoryMessages = resolveMemory(_memory);
    if (memoryMessages.length > MAX_MEMORY_MESSAGES) {
      memoryMessages.splice(0, memoryMessages.length - MAX_MEMORY_MESSAGES);
    }

    // ── Build System Prompt ────────────────────────────────────────────
    const _now = new Date();
    const _dateStr = _now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const _timeStr = _now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
    let system = REACT_SYSTEM_PROMPT + `\n\n## Current Date & Time\nToday is ${_dateStr}. Current time: ${_timeStr}. Always use this as the reference when creating calendar events, scheduling, or anything date-related.`;

    if (systemPrompt) {
      system += `\n\n--- User Instructions ---\n${systemPrompt}`;
    }

    if (tools.length > 0) {
      system +=
        `\n\nYou have ${tools.length} tool(s) available: ` +
        tools.map((t) => `"${t.name}"`).join(", ") +
        ".";
    } else {
      system +=
        "\n\nNo tools are available. Answer the user's goal directly from your own knowledge.";
    }

    if (outputFormat === "json") {
      system +=
        "\n\nIMPORTANT: Your final answer must be valid JSON. No markdown fences, no explanations — just the JSON object or array.";
    }

    // ── Build Input Context ────────────────────────────────────────────
    const inputSummary =
      typeof input === "string"
        ? input.substring(0, MAX_INPUT_BYTES)
        : JSON.stringify(input, null, 2)?.substring(0, MAX_INPUT_BYTES) ?? "";

    // ── Categorise attachments ─────────────────────────────────────────
    const MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024; // 4 MB
    const imageAttachments = inputAttachments.filter((a) => {
      if (!a?.mimeType?.startsWith("image/") || !a?.dataUrl) return false;
      const b64 = a.dataUrl.includes(",") ? a.dataUrl.split(",")[1] : a.dataUrl;
      return b64.length <= MAX_IMAGE_BASE64_BYTES;
    });
    const oversizedImages = inputAttachments.filter((a) => {
      if (!a?.mimeType?.startsWith("image/") || !a?.dataUrl) return false;
      const b64 = a.dataUrl.includes(",") ? a.dataUrl.split(",")[1] : a.dataUrl;
      return b64.length > MAX_IMAGE_BASE64_BYTES;
    });
    const nonImageAttachments = [
      ...inputAttachments.filter((a) => a?.dataUrl && !a?.mimeType?.startsWith("image/")),
      ...oversizedImages,
    ];

    // ── Build Initial Message Array ────────────────────────────────────
    const messages = [];

    for (const msg of memoryMessages) {
      messages.push(msg);
    }

    for (const msg of conversationHistory) {
      messages.push(msg);
    }

    const TEXT_MIMES = ["text/", "application/json", "application/xml", "application/yaml", "application/csv", "application/javascript"];
    let attachmentContext = "";
    if (nonImageAttachments.length > 0) {
      const parts = nonImageAttachments.map((a, i) => {
        const mime = a.mimeType || "unknown";
        if (mime.startsWith("video/")) return `[Attachment ${i}: ${a.name || "file"} (${mime}) — video, cannot be read as text]`;
        if (mime.startsWith("audio/")) return `[Attachment ${i}: ${a.name || "file"} (${mime}) — audio, cannot be read as text]`;
        if (mime === "application/pdf") return `[Attachment ${i}: ${a.name || "document.pdf"} — PDF binary, content not extractable as text]`;
        if (mime.startsWith("image/")) return `[Attachment ${i}: ${a.name || "file"} (${mime}) — image too large to send to vision API]`;
        const isText = TEXT_MIMES.some((p) => mime.startsWith(p));
        if (!isText) return `[Attachment ${i}: ${a.name || "file"} (${mime}) — binary file, cannot be read as text]`;
        try {
          const base64Data = a.dataUrl.includes(",") ? a.dataUrl.split(",")[1] : a.dataUrl;
          const text = Buffer.from(base64Data, "base64").toString("utf-8").substring(0, 4000);
          return `[Attachment ${i}: ${a.name || "file"} (${mime})]\n${text}`;
        } catch {
          return `[Attachment ${i}: ${a.name || "file"} (${mime}) — could not decode]`;
        }
      });
      attachmentContext = "\n\n---\nUser Attachments:\n" + parts.join("\n\n");
    }

    // Tell the LLM which attachments exist so it can forward them via tools.
    let attachmentIndex = "";
    if (inputAttachments.length > 0) {
      const summary = inputAttachments.map((a, i) =>
        `[${i}] ${a.name || "file"} (${a.mimeType || "unknown"})`
      ).join(", ");
      attachmentIndex = `\n\nThe user sent ${inputAttachments.length} attachment(s): ${summary}. To forward them via Gmail/Slack/Telegram, pass attachmentIndices=[0,1,...] in the tool call.`;
    }

    const userTextContent = inputSummary
      ? `${prompt}\n\n---\nInput Data:\n${inputSummary}${attachmentContext}${attachmentIndex}`
      : `${prompt}${attachmentContext}${attachmentIndex}`;

    // Build multimodal content when images are present
    const userContent = imageAttachments.length > 0
      ? buildMultimodalContent(userTextContent, imageAttachments, provider)
      : userTextContent;

    messages.push({ role: "user", content: userContent });

    // ══════════════════════════════════════════════════════════════════
    // ReAct EXECUTION LOOP — Think → Act → Observe → Repeat
    // ══════════════════════════════════════════════════════════════════
    const maxIter = Math.min(Math.max(maxIterations, 1), MAX_ITERATIONS_CEILING);
    const intermediateSteps = [];
    const collectedScreenshots = [];
    let totalTokens = 0;
    let iteration = 0;

    while (iteration < maxIter) {
      iteration++;

      // ── TOKEN GUARD: Summarize scratchpad if context is too large ─
      if (estimateCharCount(messages) > SUMMARIZE_CHAR_THRESHOLD) {
        const summarizeResult = await summarizeScratchpad({
          provider,
          apiKey,
          model: resolvedModel,
          system,
          messages,
          temperature: 0.1,
          maxTokens: 2048,
          baseUrl: providerBaseUrl,
        });
        messages.length = 0;
        messages.push(...summarizeResult.messages);
        totalTokens += summarizeResult.tokensUsed;
      }

      // ── THINK: Call LLM ──────────────────────────────────────────
      const response = await callProvider({
        provider,
        apiKey,
        model: resolvedModel,
        system,
        messages,
        temperature,
        maxTokens,
        tools: formattedTools,
        baseUrl: providerBaseUrl,
      });

      totalTokens += response.tokensUsed;

      // ── ACT: Did the LLM request tool calls? ─────────────────────
      if (response.toolCalls && response.toolCalls.length > 0 && formattedTools) {
        // Append the assistant's tool-call message to conversation history
        messages.push(buildAssistantToolCallMessage(response, provider));

        // Run all tool calls in parallel (independent actions execute simultaneously)
        const toolCallResults = await Promise.all(
          response.toolCalls.map(async (tc) => {
            const stepIndex = intermediateSteps.length;
            intermediateSteps.push({
              iteration,
              thought: response.text || null,
              action: tc.name,
              actionInput: tc.arguments,
            });

            // ── OBSERVE: Execute the tool ────────────────────────────
            // Errors are caught and returned as messages so the agent
            // can self-correct: "Tool X failed because Y, let me try Z."
            const observation = await executeToolCall(tc, tools);

            // Collect screenshots from virtual computer calls for the output gallery
            if (tc.name === "tool_virtual_computer" && observation?.screenshot) {
              collectedScreenshots.push({
                iteration,
                action: tc.arguments?.action || "screenshot",
                screenshot: observation.screenshot,
              });
            }

            // Strip screenshot from stored intermediateStep to avoid duplicating MBs of data
            const { screenshot: _ss, ...observationForLog } = (observation && typeof observation === "object") ? observation : {};
            intermediateSteps[stepIndex].observation = _ss ? observationForLog : observation;
            return { tc, observation };
          })
        );

        // Feed all observations back before next LLM call
        for (const { tc, observation } of toolCallResults) {
          const msg = buildToolResultMessage(tc, observation, provider);
          if (Array.isArray(msg)) messages.push(...msg);
          else messages.push(msg);
        }

        // Loop back → LLM sees tool results in the next THINK step
        continue;
      }

      // ── FINAL ANSWER: No tool calls → agent is done ──────────────
      let result = response.text;

      if (outputFormat === "json") {
        result = parseJsonResponse(result);
      }

      // ── Save conversation turn to Redis ───────────────────────────
      if (memKey) {
        try {
          const assistantText = typeof result === "string" ? result : JSON.stringify(result);
          const updated = [
            ...conversationHistory,
            { role: "user", content: userContent },
            { role: "assistant", content: assistantText },
          ];
          const cap = memoryMaxMessages * 2;
          await redis.set(memKey, JSON.stringify(updated.slice(-cap)), "EX", 60 * 60 * 24 * 7);
        } catch {
          // Non-fatal: continue without saving
        }
      }

      return buildOutput({
        result,
        model: response.model || resolvedModel,
        tokensUsed: totalTokens,
        provider,
        iterations: iteration,
        intermediateSteps,
        returnIntermediateSteps,
        screenshots: collectedScreenshots,
      });
    }

    // ── Budget Exhausted ───────────────────────────────────────────────
    // Agent couldn't converge within maxIterations. Return best effort.
    const lastAssistantMsg = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");

    const fallbackText =
      lastAssistantMsg?.content ||
      `Agent completed ${iteration} iterations without a final answer. ` +
        `Consider increasing Max Iterations or simplifying the task.`;

    const fallbackResult =
      outputFormat === "json" ? parseJsonResponse(fallbackText) : fallbackText;

    return buildOutput({
      result: fallbackResult,
      model: resolvedModel,
      tokensUsed: totalTokens,
      provider,
      iterations: iteration,
      intermediateSteps,
      returnIntermediateSteps,
      screenshots: collectedScreenshots,
      warning: "max_iterations_exhausted",
    });
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// TOOL ASSEMBLY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Merge tools from all three sources into a single deduplicated array.
 * Each tool in the final array has: { name, description, parameters, execute }.
 */
async function assembleTools({
  handleTools,
  enabledToolIds,
  builtinWebSearch,
  webSearchCredentialId,
  workspaceId,
  toolRegistry,
  platformTools,
  inputAttachments = [],
}) {
  const tools = [];
  const seen = new Set();

  // Source 1: Handle-routed tools (from connected nodes via cursor executor)
  const fromHandles = resolveHandleTools(handleTools);
  for (const t of fromHandles) {
    if (!seen.has(t.name)) {
      seen.add(t.name);
      tools.push(t);
    }
  }

  // Source 2: ToolRegistry — resolve tool IDs to executable definitions
  if (toolRegistry && Array.isArray(enabledToolIds) && enabledToolIds.length > 0) {
    for (const toolId of enabledToolIds) {
      if (seen.has(toolId)) continue;

      const resolved = await toolRegistry.resolve(toolId, { workspaceId });
      if (resolved && resolved.name) {
        seen.add(resolved.name);
        tools.push({
          name: resolved.name,
          description: resolved.description || `Execute the ${resolved.name} tool`,
          parameters: resolved.parameters || { type: "object", properties: {} },
          execute: typeof resolved.execute === "function" ? resolved.execute : null,
        });
      }
    }
  }

  // Source 3: Built-in web_search (Tavily)
  if (builtinWebSearch && webSearchCredentialId && !seen.has("web_search")) {
    try {
      const searchCred = await resolveCredential(
        webSearchCredentialId,
        workspaceId,
        "Web Search (built-in)"
      );
      const searchApiKey = decrypt(
        searchCred.encryptedData,
        searchCred.iv,
        searchCred.authTag
      );

      tools.push({
        ...BUILTIN_TOOLS.web_search,
        execute: async (args) => {
          const res = await axios.post(
            "https://api.tavily.com/search",
            {
              api_key: searchApiKey,
              query: args.query,
              search_depth: args.searchDepth || "basic",
              max_results: Math.min(args.maxResults || 5, 20),
              include_answer: true,
            },
            { timeout: TOOL_TIMEOUT_MS }
          );
          return {
            answer: res.data.answer || null,
            results: (res.data.results || []).map((r) => ({
              title: r.title,
              url: r.url,
              content: r.content,
              score: r.score,
            })),
            query: res.data.query,
          };
        },
      });
      seen.add("web_search");
    } catch (err) {
      // Non-fatal: continue without built-in search
      console.warn(`AI Agent: Built-in web_search skipped — ${err.message}`);
    }
  }

  // Built-in: calculator (always enabled)
  if (!seen.has("calculator")) {
    tools.push({
      ...BUILTIN_TOOLS.calculator,
      execute: async (args) => {
        try {
          const expr = String(args.expression || "").trim();
          if (!expr) return { error: "Empty expression" };
          if (expr.length > 500) return { error: "Expression too long" };

          const result = evalMathExpression(expr);

          if (typeof result !== "number" || !isFinite(result)) {
            return { error: "Result is not a finite number", expression: expr };
          }

          return {
            expression: expr,
            result,
            formatted: Number.isInteger(result)
              ? result.toString()
              : result.toFixed(6).replace(/\.?0+$/, ""),
          };
        } catch (err) {
          return { error: `Calculation failed: ${err.message}`, expression: args.expression };
        }
      },
    });
    seen.add("calculator");
  }

  // Built-in: wikipedia (always enabled)
  if (!seen.has("wikipedia")) {
    tools.push({
      ...BUILTIN_TOOLS.wikipedia,
      execute: async (args) => {
        try {
          const query = encodeURIComponent(args.query);
          const sentences = Math.min(args.sentences || 5, 10);
          const searchRes = await axios.get(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&srlimit=3`,
            { timeout: 8000 }
          );
          const results = searchRes.data?.query?.search || [];
          if (!results.length) return { error: `No Wikipedia article found for: ${args.query}` };

          const title = encodeURIComponent(results[0].title);
          const summaryRes = await axios.get(
            `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=${sentences}&exintro&explaintext&titles=${title}&format=json`,
            { timeout: 8000 }
          );
          const pages = summaryRes.data?.query?.pages || {};
          const page = Object.values(pages)[0];

          return {
            title: page?.title || results[0].title,
            summary:
              page?.extract ||
              results[0].snippet?.replace(/<[^>]+>/g, "") ||
              "No summary available",
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page?.title || results[0].title)}`,
          };
        } catch (err) {
          return { error: `Wikipedia search failed: ${err.message}` };
        }
      },
    });
    seen.add("wikipedia");
  }

  // Built-in: http_request (always enabled — agent calls external APIs)
  if (!seen.has("http_request")) {
    tools.push({
      ...BUILTIN_TOOLS.http_request,
      execute: async (args) => {
        try {
          const url = String(args.url || "").trim();
          if (!url) return { error: "URL is required" };

          try { await assertSafeUrlResolved(url); }
          catch (e) { return { error: e.message }; }

          const method = (args.method || "GET").toUpperCase();
          const timeout = Math.min((args.timeout || 15) * 1000, 60000);

          const response = await axios({
            method,
            url,
            headers: { "User-Agent": "Blinkbox-Agent/1.0", ...args.headers },
            data: args.body,
            timeout,
            maxContentLength: 1024 * 1024,
            maxRedirects: 5,
            beforeRedirect: (opts) => assertSafeUrl(`${opts.protocol}//${opts.hostname}${opts.path || ""}`),
            validateStatus: () => true,
          });

          let data = response.data;
          if (typeof data === "string") {
            try { data = JSON.parse(data); } catch { /* keep as string */ }
          }
          const dataStr = typeof data === "string" ? data : JSON.stringify(data);
          if (dataStr.length > 8000) {
            data =
              typeof data === "string"
                ? data.slice(0, 8000) + "\n...[truncated]"
                : { ...data, __truncated: true, __note: "Response was too large and was truncated" };
          }

          return {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(
              Object.entries(response.headers).filter(([k]) =>
                ["content-type", "x-ratelimit-remaining", "x-request-id"].includes(k)
              )
            ),
            data,
          };
        } catch (err) {
          if (err.code === "ERR_INVALID_URL") return { error: `Invalid URL: ${args.url}` };
          return { error: `HTTP request failed: ${err.message}` };
        }
      },
    });
    seen.add("http_request");
  }

  // Built-in: execute_js (always enabled)
  if (!seen.has("execute_js")) {
    tools.push({
      ...BUILTIN_TOOLS.execute_js,
      execute: async (args) => {
        let isolate;
        try {
          const code = String(args.code || "").trim();
          if (!code) return { error: "Code is required" };
          if (code.length > 10000) return { error: "Code too long (max 10000 characters)" };

          const timeout = Math.min(args.timeout || 5000, 30000);

          let ivm;
          try {
            ivm = (await import("isolated-vm")).default;
          } catch {
            return { success: false, error: "Sandbox unavailable (isolated-vm not installed)" };
          }

          // Real V8 isolate: no Node globals, no require/process/fs, hard memory
          // cap and a hard timeout the engine enforces (not a racing Promise that
          // can't actually stop runaway synchronous code).
          isolate = new ivm.Isolate({ memoryLimit: 64 });
          const context = await isolate.createContext();
          await context.global.set("input", new ivm.ExternalCopy(args.input || {}).copyInto());

          const script = await isolate.compileScript(`
            (function () {
              let __r;
              try { __r = (function () { ${code} })(); }
              catch (e) { return JSON.stringify({ __error: e && e.message ? e.message : String(e) }); }
              try { return JSON.stringify(__r === undefined ? null : __r); }
              catch { return JSON.stringify(String(__r)); }
            })()
          `);
          const raw = await script.run(context, { timeout });
          const parsed = JSON.parse(raw || "null");

          if (parsed && typeof parsed === "object" && "__error" in parsed) {
            return { success: false, error: parsed.__error, hint: "Check your code syntax and logic. Use 'return' to return a value." };
          }

          const outputStr = typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
          return {
            success: true,
            result: parsed,
            output: outputStr?.slice(0, 5000),
            truncated: (outputStr?.length ?? 0) > 5000,
          };
        } catch (err) {
          const msg = /timed out/i.test(err.message) ? `Code execution timed out` : err.message;
          return { success: false, error: msg, hint: "Check your code syntax and logic. Use 'return' to return a value." };
        } finally {
          try { isolate?.dispose(); } catch {}
        }
      },
    });
    seen.add("execute_js");
  }

  // Source 4: Platform integrations (user-authorized in the agent panel)
  if (Array.isArray(platformTools) && platformTools.length > 0) {
    for (const pt of platformTools) {
      const { type, credentialId, alias } = pt || {};
      if (!type || !credentialId) continue;
      const spec = PLATFORM_TOOL_SPECS[type];
      if (!spec) continue;
      const toolName = alias
        ? `${type}_${alias.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_")}`
        : type;
      if (seen.has(toolName)) continue;
      tools.push({
        name: toolName,
        description: alias ? `${spec.description} (${alias})` : spec.description,
        parameters: spec.parameters,
        execute: (args) => spec.run(args, credentialId, workspaceId, inputAttachments),
      });
      seen.add(toolName);
    }
  }

  // Source 5: Always-on remember / recall — persist facts across agent turns
  if (!seen.has("remember")) {
    const memPrefix = `agent:facts:${workspaceId || "global"}`;
    tools.push({
      name: "remember",
      description: "Store a fact or piece of information for later use in this session. Call this whenever you learn something important that you'll need to reference again.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Short identifier for this fact (e.g. 'user_email', 'order_total')" },
          value: { type: "string", description: "The value to store" },
          ttl: { type: "number", description: "Seconds to keep (default 3600 = 1 hour)" },
        },
        required: ["key", "value"],
      },
      execute: async ({ key, value, ttl = 3600 }) => {
        try {
          if (!redis) return { stored: false, reason: "Redis not available" };
          const k = `${memPrefix}:${String(key).slice(0, 100)}`;
          await redis.set(k, String(value).slice(0, 10000), "EX", Math.min(ttl, 86400));
          return { stored: true, key };
        } catch {
          return { stored: false };
        }
      },
    });
    seen.add("remember");
  }

  if (!seen.has("recall")) {
    const memPrefix = `agent:facts:${workspaceId || "global"}`;
    tools.push({
      name: "recall",
      description: "Retrieve a previously stored fact by its key. Use this to look up information you stored earlier with 'remember'.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "The key you used when calling remember()" },
        },
        required: ["key"],
      },
      execute: async ({ key }) => {
        try {
          if (!redis) return { found: false };
          const k = `${memPrefix}:${String(key).slice(0, 100)}`;
          const val = await redis.get(k);
          return val !== null ? { found: true, key, value: val } : { found: false, key };
        } catch {
          return { found: false };
        }
      },
    });
    seen.add("recall");
  }

  return tools;
}

/**
 * Normalize tools arriving from the _tools handle.
 * Accepts: array of tool definitions or a single tool definition.
 * Each tool must have at minimum: { name }.
 */
// ═════════════════════════════════════════════════════════════════════════════
// PLATFORM TOOL SPECS — wires real Blinkbox integration nodes as agent tools
// ═════════════════════════════════════════════════════════════════════════════

const PLATFORM_TOOL_SPECS = {
  slack: {
    description: "Post messages to Slack channels or upload files to Slack. Use attachmentIndices to forward user-uploaded files/images directly to Slack.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["postMessage", "uploadFile"], description: "postMessage to send text, uploadFile to upload a file or user attachment" },
        channel: { type: "string", description: "Slack channel name (#general) or ID" },
        text: { type: "string", description: "Message text — supports Slack mrkdwn (*bold*, _italic_, ```code```)" },
        filename: { type: "string", description: "Filename for uploadFile operation" },
        fileContent: { type: "string", description: "Text content to upload as file (use attachmentIndices for binary files)" },
        attachmentIndices: { type: "array", items: { type: "integer" }, description: "Indices of user-provided input attachments to upload to Slack (e.g. [0] to upload the first file)" },
      },
      required: ["operation", "channel"],
    },
    run: async (args, credentialId, workspaceId, inputAttachments = []) => {
      const resolvedAttachments = (args.attachmentIndices || [])
        .map((i) => inputAttachments[i])
        .filter(Boolean);
      return _slackNode.run({ ...args, credentialId, attachments: resolvedAttachments }, {}, { workspaceId });
    },
  },
  gmail: {
    description: "Read, send, reply to, or search Gmail emails. Use readEmail to get full content of a specific email by messageId. Use searchEmails to find emails — it returns full content for each match (from, to, subject, body, date). Use sendEmail to send a new email. Use replyToEmail to reply in a thread (requires threadId). Pass attachmentIndices to forward user-uploaded files as email attachments.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["sendEmail", "replyToEmail", "searchEmails", "readEmail"], description: "Operation to perform" },
        to: { type: "string", description: "Recipient email address (for sendEmail)" },
        subject: { type: "string", description: "Email subject line (for sendEmail)" },
        body: { type: "string", description: "Email body content (for sendEmail/replyToEmail)" },
        html: { type: "boolean", description: "Set to true if body contains HTML markup — sets Content-Type to text/html so it renders correctly in email clients" },
        threadId: { type: "string", description: "Thread ID for replyToEmail" },
        messageId: { type: "string", description: "Message ID for readEmail" },
        query: { type: "string", description: "Gmail search query for searchEmails (e.g. 'from:boss@company.com is:unread')" },
        maxResults: { type: "number", description: "Max emails to return for searchEmails (default 5, max 20)" },
        attachmentIndices: { type: "array", items: { type: "integer" }, description: "Indices of user-provided input attachments to include in the email (e.g. [0] to attach the first file the user uploaded)" },
      },
      required: ["operation"],
    },
    run: async (args, credentialId, workspaceId, inputAttachments = []) => {
      if (args.operation === "searchEmails") {
        const searchResult = await _gmailNode.run({ ...args, credentialId, maxResults: Math.min(args.maxResults || 5, 20) }, {}, { workspaceId });
        const messages = searchResult.messages || [];
        if (!messages.length) return { messages: [], total: 0 };
        const fullMessages = await Promise.all(
          messages.map((m) =>
            _gmailNode.run({ operation: "readEmail", messageId: m.id, credentialId }, {}, { workspaceId })
              .catch(() => ({ messageId: m.id, error: "Failed to fetch content" }))
          )
        );
        return { messages: fullMessages, total: searchResult.total };
      }
      const resolvedAttachments = (args.attachmentIndices || [])
        .map((i) => inputAttachments[i])
        .filter(Boolean);
      return _gmailNode.run({ ...args, credentialId, attachments: resolvedAttachments }, {}, { workspaceId });
    },
  },
  discord: {
    description: "Send messages, embeds, or files to Discord channels. Use sendFile with attachmentIndex to forward a user-uploaded file.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["sendMessage", "sendEmbed", "sendFile"], description: "Operation — use sendFile to upload a binary attachment" },
        channelId: { type: "string", description: "Discord channel ID (numeric)" },
        content: { type: "string", description: "Message text content" },
        embeds: { type: "array", description: "Array of Discord embed objects (for sendEmbed)" },
        message: { type: "string", description: "Optional text shown alongside the file (for sendFile)" },
        attachmentIndex: { type: "integer", description: "Index of a user-provided input attachment to send as a file (e.g. 0 for the first)" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId, inputAttachments = []) => {
      const attachment = typeof args.attachmentIndex === "number" ? inputAttachments[args.attachmentIndex] : null;
      return _discordNode.run({ ...args, credentialId, _inlineAttachment: attachment || undefined }, {}, { workspaceId });
    },
  },
  telegram: {
    description: "Send Telegram messages, photos, or documents via bot. Use attachmentIndex to forward a user-uploaded file/image directly to Telegram.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["sendMessage", "sendPhoto", "sendDocument"], description: "Operation — use sendPhoto for images, sendDocument for other files" },
        chatId: { type: "string", description: "Chat ID or @username" },
        text: { type: "string", description: "Message text" },
        photoUrl: { type: "string", description: "Photo URL for sendPhoto (use attachmentIndex instead if forwarding a user upload)" },
        caption: { type: "string", description: "Caption for sendPhoto/sendDocument" },
        attachmentIndex: { type: "integer", description: "Index of a user-provided input attachment to send (e.g. 0 for the first file). Use with sendPhoto or sendDocument." },
      },
      required: ["operation", "chatId"],
    },
    run: async (args, credentialId, workspaceId, inputAttachments = []) => {
      const attachment = typeof args.attachmentIndex === "number" ? inputAttachments[args.attachmentIndex] : null;
      return _telegramNode.run({ ...args, credentialId, _inlineAttachment: attachment || undefined }, {}, { workspaceId });
    },
  },
  notion: {
    description: "Create Notion pages, query databases, or append content to pages.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["createPage", "queryDatabase", "getPage", "appendBlocks", "updatePage"], description: "Operation" },
        databaseId: { type: "string", description: "Notion database ID (for createPage/queryDatabase)" },
        pageId: { type: "string", description: "Page ID (for getPage/appendBlocks/updatePage)" },
        properties: { type: "object", description: "Page properties in Notion API format" },
        filter: { type: "object", description: "Filter object for queryDatabase" },
        blocks: { type: "array", description: "Content blocks for appendBlocks" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId) => _notionNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  airtable: {
    description: "Create, read, update, or delete Airtable records.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["createRecord", "listRecords", "updateRecord", "deleteRecord", "getRecord"], description: "Operation" },
        baseId: { type: "string", description: "Airtable base ID (starts with 'app')" },
        tableId: { type: "string", description: "Table name or ID" },
        fields: { type: "object", description: "Record fields for create/update" },
        recordId: { type: "string", description: "Record ID for update/delete/get" },
        filterByFormula: { type: "string", description: "Airtable formula for listRecords filtering" },
      },
      required: ["operation", "baseId", "tableId"],
    },
    run: (args, credentialId, workspaceId) => _airtableNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  google_sheets: {
    description: "Read or write Google Sheets spreadsheets.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["appendRow", "readRows", "updateRow", "clearRange"], description: "Operation" },
        spreadsheetId: { type: "string", description: "Google Sheets document ID (from URL)" },
        range: { type: "string", description: "A1 notation range (e.g. 'Sheet1!A:Z')" },
        values: { type: "array", description: "Array of row arrays to write — e.g. [['John', 'john@example.com']]" },
      },
      required: ["operation", "spreadsheetId", "range"],
    },
    run: (args, credentialId, workspaceId) => _sheetsNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  github: {
    description: "Create or read GitHub issues, PRs, comments, releases, repo info, and create or update files (commits) in a repo.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["createIssue", "getIssue", "listIssues", "createComment", "createPR", "createFile", "mergePR", "listPRs", "getRepo", "createRelease"], description: "Operation" },
        owner: { type: "string", description: "Repository owner or organization" },
        repo: { type: "string", description: "Repository name" },
        title: { type: "string", description: "Issue, PR, or release title" },
        body: { type: "string", description: "Issue, PR, comment, or release body (markdown supported)" },
        issueNumber: { type: "number", description: "Issue/PR number for comment/get operations" },
        prNumber: { type: "number", description: "PR number for merge operations" },
        labels: { type: "array", description: "Array of label names" },
        head: { type: "string", description: "Head branch for createPR" },
        base: { type: "string", description: "Base branch for createPR (default 'main')" },
        path: { type: "string", description: "File path within the repo for createFile, e.g. 'docs/notes.md'" },
        content: { type: "string", description: "Full file content (text) for createFile — overwrites if the file already exists" },
        commitMessage: { type: "string", description: "Commit message for createFile" },
        branch: { type: "string", description: "Branch to commit to for createFile (defaults to the repo's default branch)" },
        tagName: { type: "string", description: "Tag name for createRelease" },
      },
      required: ["operation", "owner", "repo"],
    },
    run: (args, credentialId, workspaceId) => _githubNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  linear: {
    description: "Create or update Linear issues and add comments.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["createIssue", "updateIssue", "addComment", "getIssue"], description: "Operation" },
        teamId: { type: "string", description: "Linear team ID" },
        title: { type: "string", description: "Issue title" },
        description: { type: "string", description: "Issue description (markdown)" },
        priority: { type: "number", description: "Priority: 0=none, 1=urgent, 2=high, 3=medium, 4=low" },
        issueId: { type: "string", description: "Issue ID for update/comment/get" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId) => _linearNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  hubspot: {
    description: "Manage HubSpot contacts, deals, companies, and tickets.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["createContact", "updateContact", "createDeal", "updateDeal", "getContact", "searchContacts"], description: "Operation" },
        objectType: { type: "string", enum: ["contacts", "deals", "companies", "tickets"], description: "HubSpot object type" },
        properties: { type: "object", description: "Properties to set (e.g. {email, firstname, lastname, phone})" },
        objectId: { type: "string", description: "Object ID for update operations" },
        searchQuery: { type: "string", description: "Search query for searchContacts" },
      },
      required: ["operation", "objectType"],
    },
    run: (args, credentialId, workspaceId) => _hubspotNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  mongodb: {
    description: "Query or write MongoDB documents.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["insertOne", "findOne", "findMany", "updateOne", "deleteOne", "aggregate"], description: "Operation" },
        collection: { type: "string", description: "MongoDB collection name" },
        filter: { type: "object", description: "Query filter (e.g. {email: 'user@example.com'})" },
        document: { type: "object", description: "Document to insert or update body" },
        pipeline: { type: "array", description: "Aggregation pipeline stages" },
        limit: { type: "number", description: "Max results for findMany (default 20)" },
      },
      required: ["operation", "collection"],
    },
    run: (args, credentialId, workspaceId) => _mongoNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  postgres: {
    description: "Run SQL queries against a PostgreSQL database.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["query", "insert", "update", "delete"], description: "Operation" },
        sql: { type: "string", description: "SQL query — use $1, $2 for parameters" },
        params: { type: "array", description: "Query parameter values matching $1, $2, etc." },
      },
      required: ["operation", "sql"],
    },
    run: (args, credentialId, workspaceId) => _postgresNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  redis: {
    description: "Get, set, or delete values in a Redis cache.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["get", "set", "del", "incr", "lpush", "lrange", "hset", "hget", "expire"], description: "Redis command" },
        key: { type: "string", description: "Redis key" },
        value: { type: "string", description: "Value to store (for set/lpush/hset)" },
        ttl: { type: "number", description: "TTL in seconds (for set/expire)" },
      },
      required: ["operation", "key"],
    },
    run: (args, credentialId, workspaceId) => _redisNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  jira: {
    description: "Create, update, or search Jira issues and projects.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["createIssue", "getIssue", "updateIssue", "transitionIssue", "addComment", "searchIssues", "listProjects"], description: "Operation to perform" },
        domain: { type: "string", description: "Your Jira domain, e.g. mycompany.atlassian.net" },
        projectKey: { type: "string", description: "Jira project key (e.g. PROJ)" },
        issueKey: { type: "string", description: "Issue key for get/update/transition/comment (e.g. PROJ-123)" },
        summary: { type: "string", description: "Issue summary/title for createIssue" },
        description: { type: "string", description: "Issue description" },
        issueType: { type: "string", description: "Issue type: Bug, Task, Story, Epic" },
        status: { type: "string", description: "Transition status name for transitionIssue" },
        comment: { type: "string", description: "Comment text for addComment" },
        jql: { type: "string", description: "JQL query string for searchIssues" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId) => _jiraNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  asana: {
    description: "Create tasks, update projects, and manage work in Asana.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["listTasks", "createTask", "updateTask", "completeTask", "getTask", "addComment", "createProject", "listProjects"], description: "Operation to perform" },
        projectId: { type: "string", description: "Asana project GID" },
        taskId: { type: "string", description: "Task GID for get/update/complete/comment" },
        name: { type: "string", description: "Task or project name" },
        notes: { type: "string", description: "Task description/notes" },
        dueOn: { type: "string", description: "Due date in YYYY-MM-DD format" },
        assignee: { type: "string", description: "Assignee GID or 'me'" },
        text: { type: "string", description: "Comment text for addComment" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId) => _asanaNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  stripe: {
    description: "Manage Stripe customers, payments, charges, and subscriptions.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["createCustomer", "getCustomer", "listCustomers", "createPaymentIntent", "getPaymentIntent", "listCharges", "createRefund", "listInvoices", "createProduct", "createPrice"], description: "Operation to perform" },
        customerId: { type: "string", description: "Stripe customer ID (cus_xxx)" },
        email: { type: "string", description: "Customer email for createCustomer" },
        name: { type: "string", description: "Customer name or product name" },
        amount: { type: "number", description: "Amount in smallest currency unit (e.g. cents)" },
        currency: { type: "string", description: "ISO currency code (usd, eur, etc.)" },
        paymentIntentId: { type: "string", description: "PaymentIntent ID for get/refund" },
        chargeId: { type: "string", description: "Charge ID for refund" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId) => _stripeNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  shopify: {
    description: "Read and manage Shopify products, orders, and customers.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["listProducts", "getProduct", "createProduct", "updateProduct", "listOrders", "getOrder", "updateOrder", "createCustomer"], description: "Operation to perform" },
        shop: { type: "string", description: "Your Shopify store domain (mystore.myshopify.com)" },
        productId: { type: "string", description: "Product ID for get/update operations" },
        orderId: { type: "string", description: "Order ID for get/update operations" },
        title: { type: "string", description: "Product title" },
        price: { type: "string", description: "Product variant price (e.g. '29.99')" },
        status: { type: "string", description: "Order status filter or new fulfillment status" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId) => _shopifyNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  clickup: {
    description: "Create tasks, update projects, and manage work in ClickUp.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["listTasks", "createTask", "updateTask", "deleteTask", "getTask", "addComment", "createFolder", "listSpaces"], description: "Operation to perform" },
        listId: { type: "string", description: "ClickUp list ID for task operations" },
        taskId: { type: "string", description: "Task ID for get/update/delete/comment" },
        name: { type: "string", description: "Task name" },
        description: { type: "string", description: "Task description" },
        priority: { type: "number", description: "Priority (1=urgent, 2=high, 3=normal, 4=low)" },
        dueDate: { type: "number", description: "Due date as Unix timestamp in milliseconds" },
        comment: { type: "string", description: "Comment text for addComment" },
        status: { type: "string", description: "Task status name for updateTask" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId) => _clickupNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  twilio: {
    description: "Send SMS messages, make phone calls, or look up phone numbers via Twilio.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["sendSms", "makeCall", "lookupNumber"], description: "Operation to perform" },
        to: { type: "string", description: "Recipient phone number in E.164 format (+15551234567)" },
        from: { type: "string", description: "Your Twilio phone number in E.164 format" },
        body: { type: "string", description: "SMS message text (for sendSms)" },
        url: { type: "string", description: "TwiML URL for call instructions (for makeCall)" },
        phoneNumber: { type: "string", description: "Phone number to look up (for lookupNumber)" },
      },
      required: ["operation", "to"],
    },
    run: (args, credentialId, workspaceId) => _twilioNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  google_calendar: {
    description: "Create, read, update, or delete Google Calendar events. Use listEvents to fetch upcoming events, createEvent to schedule something, updateEvent to change an existing event, deleteEvent to remove one.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["listEvents", "createEvent", "getEvent", "updateEvent", "deleteEvent", "listCalendars"], description: "Operation to perform" },
        calendarId: { type: "string", description: "Calendar ID — use 'primary' for the user's main calendar (default)" },
        summary: { type: "string", description: "Event title (for createEvent/updateEvent)" },
        description: { type: "string", description: "Event description (for createEvent/updateEvent)" },
        location: { type: "string", description: "Event location (for createEvent/updateEvent)" },
        startTime: { type: "string", description: "Event start in ISO 8601 format (e.g. 2025-06-01T10:00:00) (for createEvent/updateEvent)" },
        endTime: { type: "string", description: "Event end in ISO 8601 format (for createEvent/updateEvent)" },
        timeZone: { type: "string", description: "IANA timezone (e.g. 'America/New_York') — defaults to UTC" },
        attendees: { type: "string", description: "Comma-separated email addresses to invite" },
        eventId: { type: "string", description: "Event ID (for getEvent/updateEvent/deleteEvent)" },
        timeMin: { type: "string", description: "Lower bound for listEvents (ISO 8601) — defaults to now" },
        timeMax: { type: "string", description: "Upper bound for listEvents (ISO 8601)" },
        limit: { type: "number", description: "Max events to return for listEvents (default 20)" },
        query: { type: "string", description: "Text search for listEvents" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId) => _gCalendarNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  google_drive: {
    description: "List, upload, download, move, or share files on Google Drive.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["listFiles", "getFile", "uploadText", "downloadText", "createFolder", "deleteFile", "moveFile", "shareFile"], description: "Operation to perform" },
        folderId: { type: "string", description: "Folder ID to list or upload into (omit for root)" },
        parentId: { type: "string", description: "Parent folder ID for createFolder (omit to create at root)" },
        fileId: { type: "string", description: "File ID (for getFile/downloadText/deleteFile/moveFile/shareFile)" },
        name: { type: "string", description: "File or folder name (for uploadText/createFolder)" },
        content: { type: "string", description: "Text content to upload (for uploadText)" },
        mimeType: { type: "string", description: "MIME type for uploadText (e.g. 'text/plain', 'text/csv')" },
        targetFolderId: { type: "string", description: "Destination folder ID for moveFile" },
        email: { type: "string", description: "Email to share with (for shareFile)" },
        role: { type: "string", description: "Share role: 'reader', 'writer', or 'owner' (for shareFile)" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId) => _gDriveNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
  outlook: {
    description: "Send, read, search Outlook emails, or create Outlook Calendar events.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["sendEmail", "replyEmail", "getEmail", "listEmails", "createEvent", "getCalendar", "createContact", "moveEmail", "flagEmail"], description: "Operation to perform" },
        to: { type: "string", description: "Recipient email (for sendEmail/replyEmail)" },
        subject: { type: "string", description: "Email subject (for sendEmail)" },
        body: { type: "string", description: "Email body (for sendEmail/replyEmail)" },
        messageId: { type: "string", description: "Message ID (for replyEmail/getEmail/moveEmail/flagEmail)" },
        folderId: { type: "string", description: "Folder to list from (for listEmails — default: inbox)" },
        limit: { type: "number", description: "Max emails for listEmails (default 10)" },
        subject_event: { type: "string", description: "Event title for createEvent" },
        start: { type: "string", description: "Event start ISO 8601 (for createEvent)" },
        end: { type: "string", description: "Event end ISO 8601 (for createEvent)" },
        attendees: { type: "string", description: "Comma-separated attendee emails (for createEvent)" },
        targetFolder: { type: "string", description: "Destination folder name for moveEmail" },
      },
      required: ["operation"],
    },
    run: (args, credentialId, workspaceId) => _outlookNode.run({ ...args, credentialId }, {}, { workspaceId }),
  },
};

function resolveHandleTools(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter((t) => t && typeof t === "object" && t.name)
    .map((t) => ({
      name: t.name,
      description: t.description || `Execute the ${t.name} tool`,
      parameters: t.parameters || { type: "object", properties: {} },
      execute: typeof t.execute === "function" ? t.execute : null,
    }));
}

// ═════════════════════════════════════════════════════════════════════════════
// MEMORY RESOLUTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Resolve memory from the _memory handle input.
 * Accepts: array of {role, content}, wrapper with .messages, or raw string.
 */
function resolveMemory(raw) {
  if (!raw) return [];

  // Memory node wrapper: { messages: [...], sessionId, ... }
  if (
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    Array.isArray(raw.messages)
  ) {
    return raw.messages.filter(isValidMessage);
  }

  if (Array.isArray(raw)) {
    return raw.filter(isValidMessage);
  }

  if (typeof raw === "object" && raw.role && raw.content) {
    return [{ role: raw.role, content: raw.content }];
  }

  if (typeof raw === "string" && raw.trim()) {
    return [{ role: "user", content: raw.trim() }];
  }

  return [];
}

function isValidMessage(m) {
  return (
    m &&
    typeof m === "object" &&
    m.role &&
    m.content != null
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// OUTPUT BUILDER
// ═════════════════════════════════════════════════════════════════════════════

function buildOutput({
  result,
  model,
  tokensUsed,
  provider,
  iterations,
  intermediateSteps,
  returnIntermediateSteps,
  screenshots,
  warning,
}) {
  const output = {
    result,
    model,
    tokensUsed,
    provider,
    agentType: "react",
    iterations,
  };

  if (returnIntermediateSteps && intermediateSteps.length > 0) {
    output.intermediateSteps = intermediateSteps;
  }

  // Keep last 8 screenshots to cap memory/storage usage (~2MB max)
  if (screenshots && screenshots.length > 0) {
    output.screenshots = screenshots.slice(-8);
  }

  if (warning) {
    output.warning = warning;
  }

  return output;
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Execute a single tool call. Errors are caught and returned as structured
 * messages so the LLM can self-correct rather than crashing the loop.
 */
async function executeToolCall(toolCall, tools) {
  const def = tools.find((t) => t.name === toolCall.name);

  if (def && typeof def.execute === "function") {
    try {
      const result = await Promise.race([
        def.execute(toolCall.arguments),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Tool "${toolCall.name}" timed out after ${TOOL_TIMEOUT_MS / 1000}s`
                )
              ),
            TOOL_TIMEOUT_MS
          )
        ),
      ]);
      return result;
    } catch (err) {
      return {
        error: true,
        tool: toolCall.name,
        message: `❌ TOOL ERROR — "${toolCall.name}" failed: ${err.message}. Report this error to the user exactly as written.`,
      };
    }
  }

  // Tool not found or has no executor
  const available = tools.map((t) => t.name).join(", ") || "none";
  return {
    error: true,
    tool: toolCall.name,
    message:
      `❌ TOOL ERROR — "${toolCall.name}" is not available. ` +
      `Available tools: ${available}. ` +
      `Please use one of the available tools or provide your answer directly.`,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PROVIDER DISPATCH
// ═════════════════════════════════════════════════════════════════════════════

// Per-call endpoint resolution. Local providers (ollama/lmstudio) can override
// the base URL from their satellite node config — but we must NEVER mutate the
// shared ENDPOINTS map to do it (that leaks one run's custom host into every
// other concurrent execution). Compute and pass the endpoint per call instead.
function resolveEndpoint(provider, baseUrl) {
  if (baseUrl && (provider === "ollama" || provider === "lmstudio")) {
    const base = baseUrl.replace(/\/$/, "").replace(/\/v1\/chat\/completions$/, "").replace(/\/v1$/, "");
    return `${base}/v1/chat/completions`;
  }
  return ENDPOINTS[provider] || ENDPOINTS.openai;
}

// Transient-failure retry: 429 + 5xx + network resets are retried with
// exponential backoff and jitter, honouring a Retry-After header when present.
// 4xx (other than 429) and auth errors are NOT retried — they won't fix
// themselves and would just burn the iteration budget.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504, 529]);
const PROVIDER_MAX_RETRIES = 3;

function isRetryable(err) {
  const status = err.response?.status;
  if (status && RETRYABLE_STATUS.has(status)) return true;
  return ["ECONNABORTED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND", "ECONNREFUSED"].includes(err.code);
}

async function withProviderRetry(fn) {
  let lastErr;
  for (let attempt = 0; attempt <= PROVIDER_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === PROVIDER_MAX_RETRIES || !isRetryable(err)) throw err;
      const retryAfter = Number(err.response?.headers?.["retry-after"]);
      const wait = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 30_000)
        : Math.min(1_000 * 2 ** attempt, 16_000) + Math.floor(Math.random() * 400);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function callProvider({
  provider,
  apiKey,
  model,
  system,
  messages,
  temperature,
  maxTokens,
  tools,
  baseUrl,
}) {
  if (provider === "anthropic") {
    return callAnthropic(apiKey, model, system, messages, temperature, maxTokens, tools);
  }
  if (provider === "gemini") {
    return callGemini(apiKey, model, system, messages, temperature, maxTokens, tools);
  }

  // All other providers use OpenAI-compatible API
  const endpoint = resolveEndpoint(provider, baseUrl);
  const label =
    provider.charAt(0).toUpperCase() + provider.slice(1).replace(/([A-Z])/g, " $1");
  return callOpenAICompat(apiKey, model, system, messages, temperature, maxTokens, tools, endpoint, label);
}

// ── OpenAI-Compatible ───────────────────────────────────────────────────────

async function callOpenAICompat(
  apiKey, model, system, messages, temperature, maxTokens, tools,
  endpoint, providerName
) {
  const body = {
    model,
    messages: [{ role: "system", content: system }, ...messages],
    temperature,
    max_tokens: maxTokens,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  try {
    const response = await withProviderRetry(() => axios.post(endpoint, body, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: 10 * 1024 * 1024,
    }));

    const choice = response.data.choices?.[0];
    const msg = choice?.message;

    const toolCalls =
      msg?.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function?.name,
        arguments: safeParse(tc.function?.arguments),
      })) || null;

    return {
      text: msg?.content || "",
      model: response.data.model,
      tokensUsed: response.data.usage?.total_tokens || 0,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
    };
  } catch (err) {
    handleProviderError(err, providerName, model);
  }
}

// ── Anthropic ───────────────────────────────────────────────────────────────

async function callAnthropic(
  apiKey, model, system, messages, temperature, maxTokens, tools
) {
  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages,
    temperature,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  try {
    const response = await withProviderRetry(() => axios.post(ENDPOINTS.anthropic, body, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: 10 * 1024 * 1024,
    }));

    const data = response.data;
    let text = "";
    let toolCalls = null;

    if (Array.isArray(data.content)) {
      const textBlocks = data.content.filter((b) => b.type === "text");
      const toolBlocks = data.content.filter((b) => b.type === "tool_use");

      text = textBlocks.map((b) => b.text).join("\n");

      if (toolBlocks.length > 0) {
        toolCalls = toolBlocks.map((b) => ({
          id: b.id,
          name: b.name,
          arguments: b.input || {},
        }));
      }
    }

    return {
      text,
      model: data.model,
      tokensUsed:
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      toolCalls,
    };
  } catch (err) {
    handleProviderError(err, "Anthropic", model);
  }
}

// ── Google Gemini ───────────────────────────────────────────────────────────

async function callGemini(
  apiKey, model, system, messages, temperature, maxTokens, tools
) {
  const endpoint = `${ENDPOINTS.gemini}/${model}:generateContent?key=${apiKey}`;

  const contents = messages.map((m) => {
    const role = m.role === "assistant" ? "model" : "user";
    const content = m.content;

    // Gemini multimodal marker — expand into text + inline_data parts
    if (content && typeof content === "object" && !Array.isArray(content) && content.__geminiMultimodal) {
      const parts = [{ text: content.text || "" }];
      for (const img of content.images || []) {
        const base64 = img.dataUrl.includes(",") ? img.dataUrl.split(",")[1] : img.dataUrl;
        parts.push({ inline_data: { mime_type: img.mimeType, data: base64 } });
      }
      return { role, parts };
    }

    return {
      role,
      parts: [{ text: typeof content === "string" ? content : JSON.stringify(content) }],
    };
  });

  const body = {
    contents,
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (tools && tools.length > 0) {
    body.tools = [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name || t.function?.name,
          description: t.description || t.function?.description || "",
          parameters: t.parameters || t.function?.parameters || {
            type: "OBJECT",
            properties: {},
          },
        })),
      },
    ];
  }

  try {
    const response = await withProviderRetry(() => axios.post(endpoint, body, {
      headers: { "Content-Type": "application/json" },
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: 10 * 1024 * 1024,
    }));

    const candidate = response.data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let text = "";
    let toolCalls = null;

    for (const part of parts) {
      if (part.text) text += part.text;
      if (part.functionCall) {
        if (!toolCalls) toolCalls = [];
        toolCalls.push({
          id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        });
      }
    }

    const usage = response.data.usageMetadata;
    return {
      text,
      model,
      tokensUsed:
        (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0),
      toolCalls,
    };
  } catch (err) {
    handleProviderError(err, "Gemini", model);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL FORMATTING (per-provider wire format)
// ═════════════════════════════════════════════════════════════════════════════

function formatToolsForProvider(toolDefs, provider) {
  if (!toolDefs || toolDefs.length === 0) return null;

  switch (provider) {
    case "anthropic":
      return toolDefs.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));

    case "gemini":
      // Gemini formatting handled inside callGemini — pass through
      return toolDefs;

    case "openai":
    case "deepseek":
    default:
      return toolDefs.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MESSAGE BUILDERS (provider-specific conversation history format)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Build the assistant message containing tool calls for conversation history.
 */
function buildAssistantToolCallMessage(response, provider) {
  if (provider === "anthropic") {
    const content = [];
    if (response.text) {
      content.push({ type: "text", text: response.text });
    }
    for (const tc of response.toolCalls) {
      content.push({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        input: tc.arguments,
      });
    }
    return { role: "assistant", content };
  }

  if (provider === "gemini") {
    const parts = [];
    if (response.text) {
      parts.push({ text: response.text });
    }
    for (const tc of response.toolCalls) {
      parts.push({
        functionCall: { name: tc.name, args: tc.arguments },
      });
    }
    return { role: "model", parts };
  }

  // OpenAI-compatible format
  return {
    role: "assistant",
    content: response.text || null,
    tool_calls: response.toolCalls.map((tc) => ({
      id: tc.id,
      type: "function",
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.arguments),
      },
    })),
  };
}

/**
 * Build a tool result message to feed back into the conversation.
 * If the result contains a screenshot field, it is extracted and sent as a
 * proper vision image block so the model can actually see it — not as a
 * truncated base64 string mixed into the JSON text.
 */
function buildToolResultMessage(toolCall, result, provider) {
  // Extract screenshot from the result object so it isn't JSON-stringified
  let screenshotB64 = null;
  let screenshotMime = "image/jpeg";
  let textResult = result;
  if (result && typeof result === "object" && typeof result.screenshot === "string" && result.screenshot.startsWith("data:image/")) {
    const { screenshot, ...rest } = result;
    const semi = screenshot.indexOf(";");
    if (semi !== -1) screenshotMime = screenshot.slice(5, semi); // extract mime from data URI
    const comma = screenshot.indexOf(",");
    screenshotB64 = comma !== -1 ? screenshot.slice(comma + 1) : screenshot;
    textResult = rest;
  }

  const resultStr = safeStringify(textResult);

  if (provider === "anthropic") {
    const contentBlocks = [{ type: "text", text: resultStr }];
    if (screenshotB64) {
      contentBlocks.push({ type: "image", source: { type: "base64", media_type: screenshotMime, data: screenshotB64 } });
    }
    return {
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolCall.id, content: contentBlocks }],
    };
  }

  if (provider === "gemini") {
    return {
      role: "function",
      parts: [{ functionResponse: { name: toolCall.name, response: { result: resultStr } } }],
    };
  }

  // OpenAI-compatible: tool results are text-only — append image_url as a follow-up user block
  if (screenshotB64) {
    return [
      { role: "tool", tool_call_id: toolCall.id, content: resultStr },
      {
        role: "user",
        content: [{ type: "image_url", image_url: { url: `data:${screenshotMime};base64,${screenshotB64}` } }],
      },
    ];
  }
  return { role: "tool", tool_call_id: toolCall.id, content: resultStr };
}

// ═════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Safely stringify a value with circular-reference detection and a byte
 * ceiling to prevent context window explosions from massive tool outputs.
 */
function safeStringify(obj) {
  let str;
  if (typeof obj === "string") {
    str = obj;
  } else {
    const seen = new WeakSet();
    try {
      str = JSON.stringify(obj, (_key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }
        return value;
      });
    } catch {
      str = String(obj);
    }
  }

  if (str.length > MAX_TOOL_OUTPUT_BYTES) {
    return (
      str.slice(0, MAX_TOOL_OUTPUT_BYTES) +
      "\n\n...[TRUNCATED: Tool output exceeded limit. Use your other tools to refine the search.]"
    );
  }
  return str;
}

function parseJsonResponse(text) {
  if (!text || typeof text !== "string") return text;

  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }

  const stripped = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(stripped);
  } catch {
    /* fall through */
  }

  return text;
}

function safeParse(str) {
  if (typeof str !== "string") return str;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

function handleProviderError(err, providerName, model) {
  const status = err.response?.status;
  const data = err.response?.data;
  const msg = data?.error?.message || data?.error?.type || err.message;

  if (status === 401) {
    throw new Error(
      `${providerName}: Invalid API key. Check your credential in the Vault.`
    );
  }
  if (status === 403) {
    throw new Error(
      `${providerName}: Access denied. Your key may lack permissions for "${model}".`
    );
  }
  if (status === 404) {
    throw new Error(
      `${providerName}: Model "${model}" not found. It may be deprecated or misspelled.`
    );
  }
  if (status === 429) {
    throw new Error(
      `${providerName}: Rate limit exceeded. Retry later or upgrade your API plan.`
    );
  }
  if (status === 400) {
    throw new Error(`${providerName}: Bad request — ${msg}`);
  }
  if (status === 413 || status === 422) {
    throw new Error(
      `${providerName}: Input too large for "${model}". Reduce input size or use a larger-context model.`
    );
  }
  if (err.code === "ECONNABORTED") {
    throw new Error(
      `${providerName}: Timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Model may be overloaded.`
    );
  }

  throw new Error(
    `${providerName} failed: ${status || err.code || "unknown"} — ${msg}`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MULTIMODAL CONTENT BUILDER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Build a multimodal content array for the user message when image attachments
 * are present. Each provider expects a different wire format.
 *
 * @param {string} text - The text portion of the message
 * @param {Array<{dataUrl: string, mimeType: string}>} images
 * @param {string} provider
 * @returns {string | Array} - string for Gemini (handled separately), array for others
 */
function buildMultimodalContent(text, images, provider) {
  if (provider === "anthropic") {
    const parts = [{ type: "text", text }];
    for (const img of images) {
      const base64 = img.dataUrl.includes(",") ? img.dataUrl.split(",")[1] : img.dataUrl;
      parts.push({
        type: "image",
        source: { type: "base64", media_type: img.mimeType, data: base64 },
      });
    }
    return parts;
  }

  if (provider === "gemini") {
    // Gemini content is handled differently — return a marker object;
    // callGemini maps it into parts[]
    return { __geminiMultimodal: true, text, images };
  }

  // OpenAI-compatible (openai, groq, xai, deepseek, openrouter, etc.)
  const parts = [{ type: "text", text }];
  for (const img of images) {
    parts.push({ type: "image_url", image_url: { url: img.dataUrl } });
  }
  return parts;
}

// ═════════════════════════════════════════════════════════════════════════════
// CHARACTER COUNT ESTIMATOR
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Estimate total character count across all messages.
 * Used as a proxy for token count (~4 chars/token) to decide when to
 * trigger scratchpad summarization.
 */
function estimateCharCount(messages) {
  let total = 0;
  for (const msg of messages) {
    const content = msg.content;
    if (typeof content === "string") {
      total += content.length;
    } else if (content && typeof content === "object" && !Array.isArray(content) && content.__geminiMultimodal) {
      total += (content.text || "").length + (content.images?.length || 0) * 5000;
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block && typeof block === "object") {
          if (typeof block.text === "string") total += block.text.length;
          if (typeof block.content === "string") total += block.content.length;
          if (typeof block.input === "object") {
            total += JSON.stringify(block.input).length;
          }
        }
      }
    }
  }
  return total;
}

// ═════════════════════════════════════════════════════════════════════════════
// ROLLING TOKEN SUMMARIZER
// ═════════════════════════════════════════════════════════════════════════════

const SUMMARIZE_SYSTEM_PROMPT =
  "You are an internal memory compressor for a ReAct agent. " +
  "You will receive a conversation scratchpad containing the agent's thoughts, " +
  "tool calls, and tool results (which may include raw HTML, large JSON, etc.). " +
  "Your job is to produce a SHORT, dense summary of what has been accomplished, " +
  "what key facts were discovered, and what the agent was about to do next. " +
  "Preserve all actionable data (URLs, IDs, values, error messages) but discard " +
  "raw HTML, formatting, and verbose content. Output ONLY the summary.";

/**
 * Compress the scratchpad when it exceeds the token threshold.
 *
 * Strategy:
 *   1. Keep the first user message (the original goal) intact
 *   2. Take all intermediate messages (assistant thoughts, tool calls, tool results)
 *   3. Ask the LLM to summarize them into a single condensed message
 *   4. Replace the intermediate section with the summary
 *   5. Return the compressed messages array
 */
async function summarizeScratchpad({
  provider,
  apiKey,
  model,
  system,
  messages,
  temperature,
  maxTokens,
  baseUrl,
}) {
  // Keep the first user message (original goal/prompt)
  const firstUserIdx = messages.findIndex((m) => m.role === "user");
  const firstUserMsg = firstUserIdx >= 0 ? messages[firstUserIdx] : null;

  // Keep the last 4 messages (most recent context) — these are likely
  // the latest tool call + result + assistant response
  const recentCount = Math.min(4, messages.length);
  const recentMessages = messages.slice(-recentCount);

  // Everything in between gets summarized
  const middleStart = firstUserIdx >= 0 ? firstUserIdx + 1 : 0;
  const middleEnd = messages.length - recentCount;

  if (middleEnd <= middleStart) {
    // Nothing to summarize — context is already compact
    return { messages, tokensUsed: 0 };
  }

  const middleMessages = messages.slice(middleStart, middleEnd);

  // Build a condensed text representation of the middle section
  const scratchpadText = middleMessages
    .map((m, i) => {
      const role = m.role || "unknown";
      let content = "";
      if (typeof m.content === "string") {
        content = m.content;
      } else if (Array.isArray(m.content)) {
        content = m.content
          .map((block) => {
            if (typeof block === "string") return block;
            if (block?.text) return block.text;
            if (block?.content) return block.content;
            if (block?.type === "tool_use") {
              return `[Tool Call: ${block.name}(${JSON.stringify(block.input).slice(0, 500)})]`;
            }
            if (block?.type === "tool_result") {
              return `[Tool Result: ${(block.content || "").slice(0, 1000)}]`;
            }
            return JSON.stringify(block).slice(0, 500);
          })
          .join("\n");
      }
      // Truncate individual messages to prevent the summarization prompt itself
      // from being too large (summarize request must fit in context)
      if (content.length > 3000) {
        content = content.slice(0, 3000) + "\n...[truncated for summarization]";
      }
      return `[${i + 1}] ${role}: ${content}`;
    })
    .join("\n\n");

  try {
    const response = await callProvider({
      provider,
      apiKey,
      model,
      system: SUMMARIZE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Summarize the following agent scratchpad (${middleMessages.length} messages). ` +
            `Preserve all key facts, values, and next-step intentions:\n\n` +
            scratchpadText,
        },
      ],
      temperature,
      maxTokens,
      tools: null,
      baseUrl,
    });

    const summaryText =
      response.text ||
      "[Scratchpad was summarized but no summary was produced]";

    // Rebuild messages: original user prompt + summary + recent messages
    const compressed = [];
    if (firstUserMsg) {
      compressed.push(firstUserMsg);
    }
    compressed.push({
      role: "assistant",
      content:
        `[SCRATCHPAD SUMMARY — ${middleMessages.length} messages compressed]\n\n` +
        summaryText,
    });
    compressed.push(...recentMessages);

    return {
      messages: compressed,
      tokensUsed: response.tokensUsed || 0,
    };
  } catch (err) {
    // Summarization failure is non-fatal — continue with the original messages
    // but aggressively truncate tool outputs to buy headroom
    const truncated = messages.map((m) => {
      if (typeof m.content === "string" && m.content.length > 2000) {
        return {
          ...m,
          content:
            m.content.slice(0, 2000) +
            "\n...[truncated: summarization failed]",
        };
      }
      return m;
    });
    return { messages: truncated, tokensUsed: 0 };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEMPORAL MICRO-ACTIVITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════
// These are called by the Temporal activities (activities.ts) to decompose
// the ReAct loop into yieldable micro-steps. They share all the provider/tool
// logic above but operate on serializable state passed in/out.

/**
 * _think: Perform one LLM call. On first invocation, initializes the full
 * conversation context (credentials, tools, memory, system prompt).
 */
agentNode._think = async function ({
  nodeConfig,
  inputData,
  messages,
  systemPrompt: existingSystemPrompt,
  toolDefs: existingToolDefs,
  workspaceId,
  isFirstCall,
}) {
  const provider = nodeConfig.provider || "openai";
  const resolvedModel =
    nodeConfig.customModel?.trim() || nodeConfig.model || DEFAULT_MODELS[provider];
  // Per-call base URL for local providers — passed to callProvider, never
  // mutated into the shared ENDPOINTS map (would leak across executions).
  const providerBaseUrl =
    (provider === "ollama" || provider === "lmstudio") ? nodeConfig.baseUrl : undefined;

  // ── Resolve credentials ─────────────────────────────────────────
  const cred = await resolveCredential(
    nodeConfig.credentialId,
    workspaceId,
    "AI Agent"
  );
  const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

  let systemPromptFinal = existingSystemPrompt;
  let toolDefsFinal = existingToolDefs;
  let formattedTools = null;

  if (isFirstCall) {
    // ── Assemble tool surface ───────────────────────────────────────
    const tools = await assembleTools({
      handleTools: nodeConfig._tools,
      enabledToolIds: nodeConfig.enabledToolIds,
      builtinWebSearch: nodeConfig.builtinWebSearch || false,
      webSearchCredentialId: nodeConfig.webSearchCredentialId,
      workspaceId,
      toolRegistry: null,
      platformTools: nodeConfig.platformTools,
    });

    toolDefsFinal = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      // execute is a function — we can't serialize it for Temporal.
      // Tool execution happens in _act via re-resolution.
      hasExecutor: typeof t.execute === "function",
    }));

    // ── Build system prompt ─────────────────────────────────────────
    const _now2 = new Date();
    const _dateStr2 = _now2.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const _timeStr2 = _now2.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
    let system = REACT_SYSTEM_PROMPT + `\n\n## Current Date & Time\nToday is ${_dateStr2}. Current time: ${_timeStr2}. Always use this as the reference when creating calendar events, scheduling, or anything date-related.`;
    if (nodeConfig.systemPrompt) {
      system += `\n\n--- User Instructions ---\n${nodeConfig.systemPrompt}`;
    }
    if (tools.length > 0) {
      system +=
        `\n\nYou have ${tools.length} tool(s) available: ` +
        tools.map((t) => `"${t.name}"`).join(", ") +
        ".";
    } else {
      system +=
        "\n\nNo tools are available. Answer the user's goal directly from your own knowledge.";
    }
    if (nodeConfig.outputFormat === "json") {
      system +=
        "\n\nIMPORTANT: Your final answer must be valid JSON. No markdown fences, no explanations — just the JSON object or array.";
    }
    systemPromptFinal = system;

    // ── Build initial messages ──────────────────────────────────────
    const memoryMessages = resolveMemory(nodeConfig._memory);
    if (memoryMessages.length > MAX_MEMORY_MESSAGES) {
      memoryMessages.splice(0, memoryMessages.length - MAX_MEMORY_MESSAGES);
    }

    const inputSummary =
      typeof inputData === "string"
        ? inputData.substring(0, MAX_INPUT_BYTES)
        : JSON.stringify(inputData, null, 2)?.substring(0, MAX_INPUT_BYTES) ??
          "";

    messages = [...memoryMessages];
    const userContent = inputSummary
      ? `${nodeConfig.prompt}\n\n---\nInput Data:\n${inputSummary}`
      : nodeConfig.prompt;
    messages.push({ role: "user", content: userContent });
  }

  // ── Format tools for the provider wire format ─────────────────────
  if (toolDefsFinal && toolDefsFinal.length > 0) {
    formattedTools = formatToolsForProvider(toolDefsFinal, provider);
  }

  // ── Call the LLM ──────────────────────────────────────────────────
  const response = await callProvider({
    provider,
    apiKey,
    model: resolvedModel,
    system: systemPromptFinal,
    messages,
    temperature: nodeConfig.temperature ?? 0.3,
    maxTokens: nodeConfig.maxTokens ?? 8192,
    tools: formattedTools,
    baseUrl: providerBaseUrl,
  });

  // ── Append assistant response to messages ─────────────────────────
  const updatedMessages = [...messages];

  if (response.toolCalls && response.toolCalls.length > 0) {
    updatedMessages.push(
      buildAssistantToolCallMessage(response, provider)
    );
  } else {
    updatedMessages.push({
      role: "assistant",
      content: response.text || "",
    });
  }

  return {
    messages: updatedMessages,
    toolCalls: response.toolCalls || null,
    text: response.text || "",
    tokensUsed: response.tokensUsed || 0,
    systemPrompt: systemPromptFinal,
    toolDefs: toolDefsFinal,
    provider,
    resolvedModel,
  };
};

/**
 * _act: Execute a single tool call and return the observation + updated messages.
 */
agentNode._act = async function ({
  toolName,
  toolArguments,
  toolDefs,
  workspaceId,
  nodeConfig,
  messages,
}) {
  // Re-assemble the live tools (with execute functions) for this activity.
  // We can't serialize closures across Temporal, so we re-resolve them here.
  const liveTools = await assembleTools({
    handleTools: nodeConfig._tools,
    enabledToolIds: nodeConfig.enabledToolIds,
    builtinWebSearch: nodeConfig.builtinWebSearch || false,
    webSearchCredentialId: nodeConfig.webSearchCredentialId,
    workspaceId,
    toolRegistry: null,
    platformTools: nodeConfig.platformTools,
  });

  const toolCall = {
    id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: toolName,
    arguments: toolArguments,
  };

  const observation = await executeToolCall(toolCall, liveTools);

  // Append tool result to messages
  const provider = nodeConfig.provider || "openai";
  const updatedMessages = messages ? [...messages] : [];
  const toolMsg = buildToolResultMessage(toolCall, observation, provider);
  if (Array.isArray(toolMsg)) updatedMessages.push(...toolMsg);
  else updatedMessages.push(toolMsg);

  return {
    observation,
    messages: updatedMessages,
  };
};

/**
 * _summarize: Compress the scratchpad when token count exceeds threshold.
 */
agentNode._summarize = async function ({
  nodeConfig,
  messages,
  systemPrompt,
  workspaceId,
}) {
  const provider = nodeConfig.provider || "openai";
  const resolvedModel =
    nodeConfig.customModel?.trim() || nodeConfig.model || DEFAULT_MODELS[provider];

  const cred = await resolveCredential(
    nodeConfig.credentialId,
    workspaceId,
    "AI Agent"
  );
  const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

  const providerBaseUrl =
    (provider === "ollama" || provider === "lmstudio") ? nodeConfig.baseUrl : undefined;

  const result = await summarizeScratchpad({
    provider,
    apiKey,
    model: resolvedModel,
    system: systemPrompt,
    messages,
    temperature: 0.1,
    maxTokens: 2048,
    baseUrl: providerBaseUrl,
  });

  return result;
};

export default agentNode;
