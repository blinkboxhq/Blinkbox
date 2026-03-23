/**
 * AI AGENT NODE — Autonomous Cognitive Engine
 *
 * The crown jewel of BlinkBox's execution engine. Supports true agentic loops
 * with tool-calling, memory injection, context augmentation, and multi-provider
 * routing across OpenAI, Anthropic, Gemini, and DeepSeek.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ AGENTIC LOOP                                                            │
 * │                                                                          │
 * │  User Prompt + Input + Context                                           │
 * │         ↓                                                                │
 * │  ┌─── LLM Call ───┐                                                     │
 * │  │                 │── text response ──→ Return final output             │
 * │  │                 │── tool_call ──→ Execute tool → append result → loop │
 * │  └─────────────────┘                                                     │
 * │         ↑                                                                │
 * │    (repeat up to maxToolRounds)                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Config:
 *   provider       — "openai" | "anthropic" | "gemini" | "deepseek"
 *   model          — Model ID string
 *   prompt         — User instruction prompt (expression-resolved)
 *   systemPrompt   — Custom system prompt (optional, expression-resolved)
 *   credentialId   — Vault reference to encrypted API key
 *   outputFormat   — "json" | "text" (default: "text")
 *   temperature    — 0-2 (default: 0.3)
 *   maxTokens      — Max response tokens (default: 4000)
 *   enableTools    — boolean — activate agentic tool-calling loop
 *   enableMemory   — boolean — inject memory messages into conversation
 *   maxToolRounds  — Max agentic loop iterations (default: 3, max: 10)
 *   parentSource   — RAG/context string injected into system prompt
 *   tools          — Array of tool definitions (from connected tool nodes)
 *   memory         — Array of {role, content} messages (from memory handle)
 *
 * Input:
 *   The full $json from the previous node is injected as context.
 *
 * Output:
 *   {
 *     result:      <parsed JSON or text>,
 *     model:       <model ID used>,
 *     tokensUsed:  <total tokens consumed across all rounds>,
 *     provider:    <provider string>,
 *     toolCalls:   <array of tool invocations made (if any)>,
 *     rounds:      <number of agentic loop iterations>,
 *   }
 */

import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

// ── API Endpoints ────────────────────────────────────────────────────────────
const ENDPOINTS = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
};

// ── Default Models ───────────────────────────────────────────────────────────
const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  gemini: "gemini-2.0-flash",
  deepseek: "deepseek-chat",
};

// ── Hard Limits ──────────────────────────────────────────────────────────────
const MAX_INPUT_BYTES = 30000;   // 30KB input cap
const MAX_TOOL_ROUNDS = 10;      // Absolute ceiling for agentic loops
const REQUEST_TIMEOUT = 120000;  // 2 minute timeout per LLM call

export default {
  async run(config, input, context = {}) {
    const {
      provider = "openai",
      model,
      prompt,
      systemPrompt,
      credentialId,
      outputFormat = "text",
      temperature = 0.3,
      maxTokens = 4000,
      enableTools = false,
      enableMemory = false,
      maxToolRounds = 3,
      parentSource,
      tools: toolDefs,
      memory,
    } = config;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!prompt) {
      throw new Error("AI Agent: 'prompt' is required. Add an instruction in the Instructions field.");
    }

    if (!ENDPOINTS[provider]) {
      throw new Error(`AI Agent: Unknown provider "${provider}". Supported: ${Object.keys(ENDPOINTS).join(", ")}`);
    }

    const resolvedModel = model || DEFAULT_MODELS[provider];

    // ── Credential Resolution ──────────────────────────────────────────────
    const cred = await resolveCredential(credentialId, context.workspaceId, "AI Agent");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    // ── Build Input Context ────────────────────────────────────────────────
    const inputSummary =
      typeof input === "string"
        ? input.substring(0, MAX_INPUT_BYTES)
        : JSON.stringify(input, null, 2).substring(0, MAX_INPUT_BYTES);

    // ── Build System Prompt ────────────────────────────────────────────────
    let system = systemPrompt || buildDefaultSystemPrompt(outputFormat);

    // Inject RAG/parent context into system prompt if provided
    if (parentSource) {
      const contextStr = typeof parentSource === "string"
        ? parentSource
        : JSON.stringify(parentSource, null, 2);
      system += `\n\n--- Reference Context ---\n${contextStr.substring(0, MAX_INPUT_BYTES)}`;
    }

    // ── Build Initial Messages ─────────────────────────────────────────────
    const messages = [];

    // Inject memory (conversation history) if enabled
    if (enableMemory && memory && Array.isArray(memory)) {
      for (const msg of memory) {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // User message: instruction + input data
    const userMessage = inputSummary
      ? `${prompt}\n\n---\nInput Data:\n${inputSummary}`
      : prompt;
    messages.push({ role: "user", content: userMessage });

    // ── Build Tool Definitions ─────────────────────────────────────────────
    const formattedTools = enableTools ? formatToolsForProvider(toolDefs, provider) : null;

    // ── Agentic Execution Loop ─────────────────────────────────────────────
    const clampedMaxRounds = Math.min(Math.max(maxToolRounds, 1), MAX_TOOL_ROUNDS);
    const toolCallLog = [];
    let totalTokens = 0;
    let round = 0;

    while (round < clampedMaxRounds) {
      round++;

      // Call the LLM
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

      // ── Check for Tool Calls ───────────────────────────────────────────
      if (response.toolCalls && response.toolCalls.length > 0 && enableTools) {
        // Append assistant's tool-call message to conversation
        messages.push(buildAssistantToolCallMessage(response, provider));

        // Process each tool call
        for (const tc of response.toolCalls) {
          toolCallLog.push({
            round,
            tool: tc.name,
            arguments: tc.arguments,
          });

          // Execute the tool via the node registry (simulated — actual execution
          // happens through the cursor engine's edge routing). For now, we append
          // a placeholder that tells the agent the tool was dispatched.
          const toolResult = await executeToolCall(tc, toolDefs);

          // Append tool result to conversation for next LLM round
          messages.push(buildToolResultMessage(tc, toolResult, provider));
        }

        // Continue the loop — let the LLM see the tool results
        continue;
      }

      // ── No Tool Calls — Final Response ─────────────────────────────────
      let result = response.text;

      // Parse JSON if requested
      if (outputFormat === "json") {
        result = parseJsonResponse(result);
      }

      return {
        result,
        model: response.model || resolvedModel,
        tokensUsed: totalTokens,
        provider,
        toolCalls: toolCallLog.length > 0 ? toolCallLog : undefined,
        rounds: round,
      };
    }

    // ── Max Rounds Exhausted ───────────────────────────────────────────────
    // The agent hit the loop ceiling. Return whatever the last response was.
    return {
      result: `AI Agent completed ${round} tool-calling rounds without producing a final answer. Consider increasing maxToolRounds or simplifying the task.`,
      model: resolvedModel,
      tokensUsed: totalTokens,
      provider,
      toolCalls: toolCallLog,
      rounds: round,
      warning: "max_rounds_exhausted",
    };
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// PROVIDER DISPATCH
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Unified LLM call dispatcher. Routes to the correct provider's API format.
 * Returns a normalized response: { text, model, tokensUsed, toolCalls }
 */
async function callProvider({ provider, apiKey, model, system, messages, temperature, maxTokens, tools }) {
  switch (provider) {
    case "anthropic":
      return callAnthropic(apiKey, model, system, messages, temperature, maxTokens, tools);
    case "gemini":
      return callGemini(apiKey, model, system, messages, temperature, maxTokens, tools);
    case "deepseek":
      return callOpenAICompat(apiKey, model, system, messages, temperature, maxTokens, tools, ENDPOINTS.deepseek, "DeepSeek");
    case "openai":
    default:
      return callOpenAICompat(apiKey, model, system, messages, temperature, maxTokens, tools, ENDPOINTS.openai, "OpenAI");
  }
}

// ── OpenAI-Compatible (OpenAI + DeepSeek) ────────────────────────────────────

async function callOpenAICompat(apiKey, model, system, messages, temperature, maxTokens, tools, endpoint, providerName) {
  const body = {
    model,
    messages: [{ role: "system", content: system }, ...messages],
    temperature,
    max_tokens: maxTokens,
  };

  // Attach tools if provided
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
      timeout: REQUEST_TIMEOUT,
      maxContentLength: 10 * 1024 * 1024,
    });

    const choice = response.data.choices?.[0];
    const msg = choice?.message;

    // Extract tool calls if present
    const toolCalls = msg?.tool_calls?.map((tc) => ({
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

// ── Anthropic ────────────────────────────────────────────────────────────────

async function callAnthropic(apiKey, model, system, messages, temperature, maxTokens, tools) {
  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages,
    temperature,
  };

  // Attach tools in Anthropic format
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
      timeout: REQUEST_TIMEOUT,
      maxContentLength: 10 * 1024 * 1024,
    });

    const data = response.data;
    let text = "";
    let toolCalls = null;

    // Anthropic returns content blocks — can mix text and tool_use
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
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      toolCalls,
    };
  } catch (err) {
    handleProviderError(err, "Anthropic", model);
  }
}

// ── Google Gemini ────────────────────────────────────────────────────────────

async function callGemini(apiKey, model, system, messages, temperature, maxTokens, tools) {
  const endpoint = `${ENDPOINTS.gemini}/${model}:generateContent?key=${apiKey}`;

  // Convert OpenAI-style messages to Gemini contents format
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    contents,
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  // Attach tools in Gemini format
  if (tools && tools.length > 0) {
    body.tools = [{
      functionDeclarations: tools.map((t) => ({
        name: t.name || t.function?.name,
        description: t.description || t.function?.description || "",
        parameters: t.parameters || t.function?.parameters || { type: "OBJECT", properties: {} },
      })),
    }];
  }

  try {
    const response = await axios.post(endpoint, body, {
      headers: { "Content-Type": "application/json" },
      timeout: REQUEST_TIMEOUT,
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
      tokensUsed: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0),
      toolCalls,
    };
  } catch (err) {
    handleProviderError(err, "Gemini", model);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL CALLING HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Format tool definitions into the native format required by each provider.
 * Accepts tools in a generic format:
 *   [{ name, description, parameters: { type: "object", properties: {...} } }]
 *
 * For OpenAI/DeepSeek: wraps in { type: "function", function: {...} }
 * For Anthropic: uses { name, description, input_schema: {...} }
 * For Gemini: handled inline in the callGemini function
 */
function formatToolsForProvider(toolDefs, provider) {
  if (!toolDefs || !Array.isArray(toolDefs) || toolDefs.length === 0) return null;

  // Normalize: if tools arrive as strings (node IDs), skip them
  const valid = toolDefs.filter((t) => t && typeof t === "object" && t.name);
  if (valid.length === 0) return null;

  switch (provider) {
    case "anthropic":
      return valid.map((t) => ({
        name: t.name,
        description: t.description || `Execute the ${t.name} tool`,
        input_schema: t.parameters || { type: "object", properties: {} },
      }));

    case "gemini":
      // Gemini formatting is handled in callGemini — pass through as-is
      return valid;

    case "openai":
    case "deepseek":
    default:
      return valid.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description || `Execute the ${t.name} tool`,
          parameters: t.parameters || { type: "object", properties: {} },
        },
      }));
  }
}

/**
 * Execute a tool call. In the current architecture, tools connected to the
 * AI Agent are resolved by the cursor executor via edge routing. Within the
 * node itself, we simulate tool execution for tools defined inline in config.
 *
 * If no matching tool handler exists, returns a graceful failure message
 * so the agent can adapt rather than crashing the workflow.
 */
async function executeToolCall(toolCall, toolDefs) {
  // Look for an executor function in the tool definitions
  if (toolDefs && Array.isArray(toolDefs)) {
    const def = toolDefs.find((t) => t.name === toolCall.name);
    if (def && typeof def.execute === "function") {
      try {
        return await def.execute(toolCall.arguments);
      } catch (err) {
        return {
          error: true,
          message: `Tool "${toolCall.name}" failed: ${err.message}`,
        };
      }
    }
  }

  // No executor found — return informative message to the LLM
  return {
    error: true,
    message: `Tool "${toolCall.name}" is not available in this execution context. Available tools: ${
      toolDefs?.map((t) => t.name).join(", ") || "none"
    }`,
  };
}

/**
 * Build the assistant message containing tool calls for conversation history.
 * Format differs by provider.
 */
function buildAssistantToolCallMessage(response, provider) {
  if (provider === "anthropic") {
    // Anthropic expects content blocks with type: "tool_use"
    const content = [];
    if (response.text) content.push({ type: "text", text: response.text });
    for (const tc of response.toolCalls) {
      content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.arguments });
    }
    return { role: "assistant", content };
  }

  // OpenAI / DeepSeek format
  return {
    role: "assistant",
    content: response.text || null,
    tool_calls: response.toolCalls.map((tc) => ({
      id: tc.id,
      type: "function",
      function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
    })),
  };
}

/**
 * Build a tool result message to feed back into the conversation.
 */
function buildToolResultMessage(toolCall, result, provider) {
  const resultStr = typeof result === "string" ? result : JSON.stringify(result);

  if (provider === "anthropic") {
    return {
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: toolCall.id,
        content: resultStr,
      }],
    };
  }

  // OpenAI / DeepSeek format
  return {
    role: "tool",
    tool_call_id: toolCall.id,
    content: resultStr,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/** Build a sensible default system prompt based on output format. */
function buildDefaultSystemPrompt(outputFormat) {
  if (outputFormat === "json") {
    return "You are a data processing agent. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object or array.";
  }
  return "You are a highly capable AI agent. Respond clearly, concisely, and accurately. When tools are available, use them proactively to gather information before answering.";
}

/** Parse LLM output as JSON, stripping markdown fences if needed. */
function parseJsonResponse(text) {
  if (!text || typeof text !== "string") return text;

  // Direct parse
  try {
    return JSON.parse(text);
  } catch { /* fall through */ }

  // Strip markdown code fences
  const stripped = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(stripped);
  } catch { /* fall through */ }

  // Return raw text if JSON parsing fails entirely
  return text;
}

/** Safely parse a JSON string, returning the original on failure. */
function safeParse(str) {
  if (typeof str !== "string") return str;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * Unified error handler for all providers.
 * Throws semantic, user-friendly errors that the cursor executor
 * can classify for retry/no-retry decisions.
 */
function handleProviderError(err, providerName, model) {
  const status = err.response?.status;
  const data = err.response?.data;
  const msg = data?.error?.message || data?.error?.type || err.message;

  if (status === 401) {
    throw new Error(`${providerName}: Invalid API key. Check your credential in the Vault.`);
  }
  if (status === 403) {
    throw new Error(`${providerName}: Access denied. Your API key may lack permissions for model "${model}".`);
  }
  if (status === 404) {
    throw new Error(
      `${providerName}: Model "${model}" not found. It may have been deprecated or the model ID is incorrect.`
    );
  }
  if (status === 429) {
    throw new Error(`${providerName}: Rate limit exceeded. Retry later or upgrade your API plan.`);
  }
  if (status === 400) {
    throw new Error(`${providerName}: Bad request — ${msg}`);
  }
  if (status === 413 || status === 422) {
    throw new Error(`${providerName}: Input too large for model "${model}". Reduce input size or use a model with a larger context window.`);
  }
  if (err.code === "ECONNABORTED") {
    throw new Error(`${providerName}: Request timed out after ${REQUEST_TIMEOUT / 1000}s. The model may be overloaded.`);
  }

  throw new Error(`${providerName} failed: ${status || err.code || "unknown"} — ${msg}`);
}
