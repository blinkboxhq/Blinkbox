/**
 * AGENT TOOL REGISTRY
 *
 * Central registry for all tools available to the AI Agent's ReAct loop.
 * Every tool follows one interface:
 *
 *   {
 *     name:        string,          — Unique identifier (snake_case)
 *     description: string,          — What the LLM reads to decide when to use this tool
 *     parameters:  JSONSchema,      — OpenAI-compatible function parameters schema
 *     execute:     (args, ctx) => any  — The actual runtime implementation
 *   }
 *
 * The registry itself exposes:
 *   register(tool)                  — Add a tool (validates shape)
 *   resolve(toolId, ctx)            — Return a ready-to-execute tool definition
 *   list()                          — Return all registered tool IDs
 *   describeAll()                   — Return name+description for system prompt injection
 *
 * Built-in tools (registered at import time):
 *   web_search       — Tavily internet search
 *   http_request     — Generic HTTP client
 *   workspace_memory — Redis key/value read/write scoped to workspace
 *   math_calculator  — Safe arithmetic expression evaluator
 *   data_extractor   — JSONPath / key extraction from structured data
 */

import axios from "axios";
import { redis } from "../infra/redis.client.js";

// ═════════════════════════════════════════════════════════════════════════════
// REGISTRY CORE
// ═════════════════════════════════════════════════════════════════════════════

const _tools = new Map();

function register(tool) {
  if (!tool || typeof tool !== "object") {
    throw new Error("ToolRegistry: tool must be an object");
  }
  if (!tool.name || typeof tool.name !== "string") {
    throw new Error("ToolRegistry: tool.name (string) is required");
  }
  if (!tool.description || typeof tool.description !== "string") {
    throw new Error("ToolRegistry: tool.description (string) is required");
  }
  if (!tool.parameters || typeof tool.parameters !== "object") {
    throw new Error(`ToolRegistry: tool.parameters (JSONSchema object) is required for "${tool.name}"`);
  }
  if (typeof tool.execute !== "function") {
    throw new Error(`ToolRegistry: tool.execute (function) is required for "${tool.name}"`);
  }

  _tools.set(tool.name, Object.freeze({ ...tool }));
}

/**
 * Resolve a tool by ID. Returns the full tool definition with an execute
 * function bound to the provided context (workspaceId, etc).
 */
function resolve(toolId, ctx = {}) {
  const tool = _tools.get(toolId);
  if (!tool) return null;

  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    execute: (args) => tool.execute(args, ctx),
  };
}

function list() {
  return [..._tools.keys()];
}

/**
 * Return compact descriptions for all registered tools.
 * Used by the AI Agent to inject tool awareness into the system prompt.
 */
function describeAll() {
  return [..._tools.values()].map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 1: WEB SEARCH (Tavily)
// ═════════════════════════════════════════════════════════════════════════════

register({
  name: "web_search",
  description:
    "Search the internet for current, real-time information. " +
    "Returns titles, URLs, content snippets, and an AI-generated summary answer. " +
    "Use this when you need up-to-date facts, news, or information not in your training data.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query — be specific for better results",
      },
      search_depth: {
        type: "string",
        enum: ["basic", "advanced"],
        description: "basic = fast, advanced = deeper (default: basic)",
      },
      max_results: {
        type: "number",
        description: "Number of results (1-10, default: 5)",
      },
    },
    required: ["query"],
  },
  execute: async (args, ctx) => {
    const apiKey = ctx.tavilyApiKey;
    if (!apiKey) {
      return { error: true, message: "Web Search: No Tavily API key configured. Add a web search credential." };
    }

    const res = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: apiKey,
        query: args.query,
        search_depth: args.search_depth || "basic",
        max_results: Math.min(args.max_results || 5, 10),
        include_answer: true,
      },
      { timeout: 30_000 }
    );

    return {
      answer: res.data.answer || null,
      results: (res.data.results || []).slice(0, 10).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content?.substring(0, 1500),
        score: r.score,
      })),
      query: res.data.query,
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 2: HTTP REQUEST
// ═════════════════════════════════════════════════════════════════════════════

register({
  name: "http_request",
  description:
    "Make an HTTP request to any URL or API endpoint. " +
    "Supports GET, POST, PUT, PATCH, DELETE with custom headers and JSON body. " +
    "Use this to call external APIs, fetch web pages, or send data to services.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The full URL to request (must include https://)",
      },
      method: {
        type: "string",
        enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        description: "HTTP method (default: GET)",
      },
      headers: {
        type: "object",
        description: "Custom request headers as key-value pairs",
      },
      body: {
        type: "object",
        description: "JSON request body (for POST/PUT/PATCH)",
      },
    },
    required: ["url"],
  },
  execute: async (args) => {
    const method = (args.method || "GET").toUpperCase();
    const url = args.url;

    if (!url || typeof url !== "string") {
      return { error: true, message: "http_request: 'url' is required" };
    }

    // Block private/internal network access
    const blocked = /^https?:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|\[::1\])/i;
    if (blocked.test(url)) {
      return { error: true, message: "http_request: Requests to private/internal networks are blocked." };
    }

    const config = {
      method,
      url,
      headers: { "Content-Type": "application/json", ...(args.headers || {}) },
      timeout: 30_000,
      maxContentLength: 5 * 1024 * 1024,
      validateStatus: () => true,
    };

    if (["POST", "PUT", "PATCH"].includes(method) && args.body) {
      config.data = args.body;
    }

    const res = await axios(config);

    // Truncate massive responses
    let data = res.data;
    if (typeof data === "string" && data.length > 15_000) {
      data = data.substring(0, 15_000) + "\n...[truncated]";
    } else if (typeof data === "object") {
      const str = JSON.stringify(data);
      if (str.length > 15_000) {
        data = JSON.parse(str.substring(0, 15_000) + '"}');
      }
    }

    return {
      status: res.status,
      statusText: res.statusText,
      headers: {
        "content-type": res.headers["content-type"],
        "content-length": res.headers["content-length"],
      },
      data,
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 3: WORKSPACE MEMORY (Redis)
// ═════════════════════════════════════════════════════════════════════════════

register({
  name: "workspace_memory",
  description:
    "Read and write key-value data to workspace-scoped persistent memory (Redis). " +
    "Use 'read' to retrieve previously stored values, 'write' to store new data, " +
    "'delete' to remove a key, or 'list' to see all stored keys. " +
    "Data persists across agent executions within the same workspace.",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["read", "write", "delete", "list"],
        description: "The memory operation to perform",
      },
      key: {
        type: "string",
        description: "The key to read/write/delete (not needed for 'list')",
      },
      value: {
        type: "string",
        description: "The value to store (only for 'write' operation). Objects will be JSON-stringified.",
      },
    },
    required: ["operation"],
  },
  execute: async (args, ctx) => {
    const { operation, key, value } = args;
    const wsId = ctx.workspaceId;

    if (!wsId) {
      return { error: true, message: "workspace_memory: No workspace context available." };
    }

    const prefix = `bb:agent:mem:${wsId}:`;
    const MAX_KEYS = 100;
    const MAX_VALUE_BYTES = 32_000;

    switch (operation) {
      case "read": {
        if (!key) return { error: true, message: "workspace_memory: 'key' is required for read." };
        const stored = await redis.get(prefix + key);
        if (stored === null) {
          return { found: false, key, value: null };
        }
        // Try to parse JSON, fall back to raw string
        try {
          return { found: true, key, value: JSON.parse(stored) };
        } catch {
          return { found: true, key, value: stored };
        }
      }

      case "write": {
        if (!key) return { error: true, message: "workspace_memory: 'key' is required for write." };
        if (value === undefined || value === null) {
          return { error: true, message: "workspace_memory: 'value' is required for write." };
        }

        // Enforce size limit
        const serialized = typeof value === "string" ? value : JSON.stringify(value);
        if (serialized.length > MAX_VALUE_BYTES) {
          return { error: true, message: `workspace_memory: Value exceeds ${MAX_VALUE_BYTES} byte limit.` };
        }

        // Enforce key count limit per workspace
        const existingKeys = await redis.keys(prefix + "*");
        if (existingKeys.length >= MAX_KEYS && !existingKeys.includes(prefix + key)) {
          return { error: true, message: `workspace_memory: Workspace has reached the ${MAX_KEYS} key limit. Delete some keys first.` };
        }

        await redis.set(prefix + key, serialized, "EX", 60 * 60 * 24 * 30); // 30-day TTL
        return { success: true, key, message: `Stored value under key "${key}".` };
      }

      case "delete": {
        if (!key) return { error: true, message: "workspace_memory: 'key' is required for delete." };
        const deleted = await redis.del(prefix + key);
        return { success: true, key, deleted: deleted > 0 };
      }

      case "list": {
        const keys = await redis.keys(prefix + "*");
        const stripped = keys.map((k) => k.replace(prefix, ""));
        return { keys: stripped, count: stripped.length };
      }

      default:
        return { error: true, message: `workspace_memory: Unknown operation "${operation}". Use read, write, delete, or list.` };
    }
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 4: MATH CALCULATOR
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Safe math evaluator — supports basic arithmetic, exponents, parentheses,
 * and common math functions. No eval(), no code injection.
 */
function safeEvaluateMath(expr) {
  // Whitelist: digits, operators, parentheses, dots, commas, spaces, math function names
  const sanitized = expr.replace(/\s+/g, "");
  if (!/^[0-9+\-*/%^().,a-z]+$/i.test(sanitized)) {
    throw new Error(`Invalid characters in expression: "${expr}"`);
  }

  // Replace common math notation
  let normalized = sanitized
    .replace(/\^/g, "**")              // ^ → **
    .replace(/\bsqrt\(/g, "Math.sqrt(")
    .replace(/\babs\(/g, "Math.abs(")
    .replace(/\bceil\(/g, "Math.ceil(")
    .replace(/\bfloor\(/g, "Math.floor(")
    .replace(/\bround\(/g, "Math.round(")
    .replace(/\bmin\(/g, "Math.min(")
    .replace(/\bmax\(/g, "Math.max(")
    .replace(/\blog\(/g, "Math.log10(")
    .replace(/\bln\(/g, "Math.log(")
    .replace(/\bsin\(/g, "Math.sin(")
    .replace(/\bcos\(/g, "Math.cos(")
    .replace(/\btan\(/g, "Math.tan(")
    .replace(/\bpi\b/gi, "Math.PI")
    .replace(/\be\b/g, "Math.E");

  // Block anything that isn't math
  if (/[a-zA-Z]/.test(normalized.replace(/Math\.[A-Z0-9a-z]+/g, ""))) {
    throw new Error(`Expression contains invalid identifiers: "${expr}"`);
  }

  // Evaluate in a restricted scope
  const fn = new Function(`"use strict"; return (${normalized});`);
  const result = fn();

  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error(`Expression evaluated to non-finite number: ${result}`);
  }

  return result;
}

register({
  name: "math_calculator",
  description:
    "Evaluate mathematical expressions safely. Supports arithmetic (+, -, *, /, %, ^), " +
    "parentheses, and functions: sqrt, abs, ceil, floor, round, min, max, log, ln, sin, cos, tan, pi, e. " +
    "Use this for any calculation — do NOT attempt mental math.",
  parameters: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: 'The math expression to evaluate, e.g. "sqrt(144) + 3^2" or "round(15.7 * 2.3)"',
      },
    },
    required: ["expression"],
  },
  execute: async (args) => {
    const { expression } = args;
    if (!expression || typeof expression !== "string") {
      return { error: true, message: "math_calculator: 'expression' is required." };
    }

    try {
      const result = safeEvaluateMath(expression);
      return { expression, result };
    } catch (err) {
      return { error: true, expression, message: `math_calculator: ${err.message}` };
    }
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// TOOL 5: DATA EXTRACTOR (JSON Parser)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Extract values from structured data using dot-notation paths.
 * Supports: "user.name", "items[0].price", "items[*].name" (wildcard),
 * and multiple paths at once.
 */
function extractByPath(data, path) {
  if (!path || typeof path !== "string") return undefined;

  const segments = path.replace(/\[(\d+|\*)\]/g, ".$1").split(".");
  let current = [data];

  for (const seg of segments) {
    const next = [];
    for (const item of current) {
      if (item === null || item === undefined) continue;

      if (seg === "*") {
        // Wildcard: expand array or object values
        if (Array.isArray(item)) {
          next.push(...item);
        } else if (typeof item === "object") {
          next.push(...Object.values(item));
        }
      } else if (/^\d+$/.test(seg)) {
        const val = Array.isArray(item) ? item[Number(seg)] : item[seg];
        if (val !== undefined) next.push(val);
      } else {
        const val = item[seg];
        if (val !== undefined) next.push(val);
      }
    }
    current = next;
    if (current.length === 0) return undefined;
  }

  return current.length === 1 ? current[0] : current;
}

register({
  name: "data_extractor",
  description:
    "Extract, parse, and restructure data from JSON objects or strings. " +
    'Supports dot-notation paths ("user.name"), array indexing ("items[0]"), ' +
    'wildcards ("items[*].price"), and extracting multiple paths at once. ' +
    "Use this to pull specific fields from API responses or complex data structures.",
  parameters: {
    type: "object",
    properties: {
      data: {
        description: "The JSON data to extract from (string or object). Strings will be parsed as JSON.",
      },
      paths: {
        type: "array",
        items: { type: "string" },
        description: 'Array of dot-notation paths to extract, e.g. ["user.name", "items[*].price"]',
      },
      path: {
        type: "string",
        description: "Single path to extract (shorthand — use 'paths' for multiple)",
      },
    },
    required: ["data"],
  },
  execute: async (args) => {
    let { data, paths, path } = args;

    // Parse string data
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return { error: true, message: "data_extractor: Could not parse data as JSON." };
      }
    }

    if (data === null || data === undefined || typeof data !== "object") {
      return { error: true, message: "data_extractor: 'data' must be a JSON object or array." };
    }

    // Single path shorthand
    if (path && !paths) {
      const result = extractByPath(data, path);
      return { path, value: result ?? null };
    }

    // Multiple paths
    if (Array.isArray(paths) && paths.length > 0) {
      const results = {};
      for (const p of paths) {
        results[p] = extractByPath(data, p) ?? null;
      }
      return { extracted: results };
    }

    // No path specified — return structure summary
    if (Array.isArray(data)) {
      return {
        type: "array",
        length: data.length,
        sample: data.length > 0 ? Object.keys(data[0] || {}) : [],
        message: "No path specified. Provide 'path' or 'paths' to extract specific values.",
      };
    }

    return {
      type: "object",
      keys: Object.keys(data),
      message: "No path specified. Provide 'path' or 'paths' to extract specific values.",
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

const toolRegistry = { register, resolve, list, describeAll };
export default toolRegistry;
