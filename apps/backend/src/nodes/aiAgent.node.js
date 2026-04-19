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
  fireworks: "https://api.fireworks.ai/inference/v1/chat/completions",
  cerebras: "https://api.cerebras.ai/v1/chat/completions",
  ollama: "http://localhost:11434/v1/chat/completions",
  novita: "https://api.novita.ai/v3/openai/chat/completions",
  deepinfra: "https://api.deepinfra.com/v1/openai/chat/completions",
  hyperbolic: "https://api.hyperbolic.xyz/v1/chat/completions",
};

const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  gemini: "gemini-2.0-flash",
  deepseek: "deepseek-chat",
  openrouter: "anthropic/claude-3.5-sonnet",
  together: "meta-llama/Llama-3-70b-chat-hf",
  perplexity: "llama-3-sonar-large-32k-online",
  xai: "grok-beta",
  fireworks: "accounts/fireworks/models/firefunction-v2",
  cerebras: "llama3.1-70b",
  ollama: "llama3",
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
};

// ═════════════════════════════════════════════════════════════════════════════
// ReAct SYSTEM PROMPT
// ═════════════════════════════════════════════════════════════════════════════
// A single, focused prompt that enforces the Think → Act → Observe cycle.
// The LLM receives this as its identity; the user's custom systemPrompt
// is layered on top as domain-specific constraints.

const REACT_SYSTEM_PROMPT =
  `You are a ReAct (Reason + Act) agent. You solve problems through an iterative loop of reasoning and action.\n` +
  `\n` +
  `For each step, follow this cycle:\n` +
  `  THINK:   Explain your reasoning — what do you know, what do you need, what should you do next?\n` +
  `  ACT:     Call a tool to gather information or perform an action. Choose the best tool for the job.\n` +
  `  OBSERVE: After receiving the tool result, analyze what you learned before deciding your next step.\n` +
  `\n` +
  `Rules:\n` +
  `  - Call ONE tool at a time. Wait for its result before deciding the next action.\n` +
  `  - If a tool fails, reason about WHY it failed and try a different approach.\n` +
  `  - When you have enough information to fully answer the user's goal, respond with your final answer directly (no tool call).\n` +
  `  - Never fabricate tool results. If you don't have enough information, use a tool to get it.\n` +
  `  - Be concise in your reasoning. The user sees your final answer, not your intermediate thoughts.`;

// ═════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═════════════════════════════════════════════════════════════════════════════

const agentNode = {
  async run(config, input, context = {}) {
    const {
      provider = "openai",
      model,
      prompt,
      systemPrompt,
      credentialId,
      enabledToolIds,
      outputFormat = "text",
      temperature = 0.3,
      maxTokens = 4096,
      maxIterations = 5,
      returnIntermediateSteps = false,

      // Handle-routed dependencies (injected by cursor executor)
      _memory,
      _tools,

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
    const cred = await resolveCredential(
      credentialId,
      context.workspaceId,
      "AI Agent"
    );
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

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
    const tools = await assembleTools({
      handleTools: _tools,
      enabledToolIds,
      builtinWebSearch,
      webSearchCredentialId,
      workspaceId: context.workspaceId,
      toolRegistry: context.toolRegistry || null,
    });

    const formattedTools =
      tools.length > 0 ? formatToolsForProvider(tools, provider) : null;

    // ── Resolve Memory ─────────────────────────────────────────────────
    const memoryMessages = resolveMemory(_memory);
    if (memoryMessages.length > MAX_MEMORY_MESSAGES) {
      memoryMessages.splice(0, memoryMessages.length - MAX_MEMORY_MESSAGES);
    }

    // ── Build System Prompt ────────────────────────────────────────────
    let system = REACT_SYSTEM_PROMPT;

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

    // ── Build Initial Message Array ────────────────────────────────────
    const messages = [];

    for (const msg of memoryMessages) {
      messages.push(msg);
    }

    for (const msg of conversationHistory) {
      messages.push(msg);
    }

    const userContent = inputSummary
      ? `${prompt}\n\n---\nInput Data:\n${inputSummary}`
      : prompt;
    messages.push({ role: "user", content: userContent });

    // ══════════════════════════════════════════════════════════════════
    // ReAct EXECUTION LOOP — Think → Act → Observe → Repeat
    // ══════════════════════════════════════════════════════════════════
    const maxIter = Math.min(Math.max(maxIterations, 1), MAX_ITERATIONS_CEILING);
    const intermediateSteps = [];
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
      });

      totalTokens += response.tokensUsed;

      // ── ACT: Did the LLM request tool calls? ─────────────────────
      if (response.toolCalls && response.toolCalls.length > 0 && formattedTools) {
        // Append the assistant's tool-call message to conversation history
        messages.push(buildAssistantToolCallMessage(response, provider));

        // Process each tool call sequentially (ReAct = one action at a time,
        // but we honor batched calls from providers that support parallel tool use)
        for (const tc of response.toolCalls) {
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

          intermediateSteps[intermediateSteps.length - 1].observation = observation;

          // Feed observation back into conversation for next iteration
          messages.push(buildToolResultMessage(tc, observation, provider));
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

  return tools;
}

/**
 * Normalize tools arriving from the _tools handle.
 * Accepts: array of tool definitions or a single tool definition.
 * Each tool must have at minimum: { name }.
 */
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
    m.content &&
    typeof m.content === "string"
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
        message: `Tool "${toolCall.name}" failed: ${err.message}. You may try a different approach.`,
      };
    }
  }

  // Tool not found or has no executor
  const available = tools.map((t) => t.name).join(", ") || "none";
  return {
    error: true,
    tool: toolCall.name,
    message:
      `Tool "${toolCall.name}" is not available. ` +
      `Available tools: ${available}. ` +
      `Please use one of the available tools or provide your answer directly.`,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PROVIDER DISPATCH
// ═════════════════════════════════════════════════════════════════════════════

async function callProvider({
  provider,
  apiKey,
  model,
  system,
  messages,
  temperature,
  maxTokens,
  tools,
}) {
  if (provider === "anthropic") {
    return callAnthropic(apiKey, model, system, messages, temperature, maxTokens, tools);
  }
  if (provider === "gemini") {
    return callGemini(apiKey, model, system, messages, temperature, maxTokens, tools);
  }

  // All other providers use OpenAI-compatible API
  const endpoint = ENDPOINTS[provider] || ENDPOINTS.openai;
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
    const response = await axios.post(endpoint, body, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: 10 * 1024 * 1024,
    });

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
    const response = await axios.post(ENDPOINTS.anthropic, body, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: 10 * 1024 * 1024,
    });

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

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [
      {
        text:
          typeof m.content === "string"
            ? m.content
            : JSON.stringify(m.content),
      },
    ],
  }));

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
    const response = await axios.post(endpoint, body, {
      headers: { "Content-Type": "application/json" },
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: 10 * 1024 * 1024,
    });

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
 * Uses safeStringify to prevent context window explosions.
 */
function buildToolResultMessage(toolCall, result, provider) {
  const resultStr = safeStringify(result);

  if (provider === "anthropic") {
    return {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: resultStr,
        },
      ],
    };
  }

  if (provider === "gemini") {
    return {
      role: "function",
      parts: [
        {
          functionResponse: {
            name: toolCall.name,
            response: { result: resultStr },
          },
        },
      ],
    };
  }

  // OpenAI-compatible format
  return {
    role: "tool",
    tool_call_id: toolCall.id,
    content: resultStr,
  };
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
    nodeConfig.model || DEFAULT_MODELS[provider];

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
      toolRegistry: null, // Registry tools resolved via enabledToolIds
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
    let system = REACT_SYSTEM_PROMPT;
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
    maxTokens: nodeConfig.maxTokens ?? 4096,
    tools: formattedTools,
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
  updatedMessages.push(buildToolResultMessage(toolCall, observation, provider));

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
    nodeConfig.model || DEFAULT_MODELS[provider];

  const cred = await resolveCredential(
    nodeConfig.credentialId,
    workspaceId,
    "AI Agent"
  );
  const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

  const result = await summarizeScratchpad({
    provider,
    apiKey,
    model: resolvedModel,
    system: systemPrompt,
    messages,
    temperature: 0.1,
    maxTokens: 2048,
  });

  return result;
};

export default agentNode;
