/**
 * AI AGENT NODE — Autonomous Cognitive Engine
 *
 * n8n-style modular architecture. The agent receives its dependencies
 * (Chat Model, Memory, Tools) from handle-routed edges, resolves them,
 * and enters an autonomous reasoning loop until it produces a final answer
 * or exhausts its iteration budget.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  AGENT LOOP (runs up to maxIterations)                                  │
 * │                                                                          │
 * │  ① Build messages: system + memory + user prompt + input data            │
 * │  ② Call LLM with tool definitions attached                               │
 * │  ③ If LLM returns text → break, return final output                      │
 * │  ④ If LLM returns tool_call:                                             │
 * │     a. Log the call as an intermediate step                              │
 * │     b. Execute the tool (or inject error on failure)                      │
 * │     c. Append tool result to messages                                    │
 * │     d. Continue loop → back to ②                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Agent Types:
 *   "tools_agent"    — Native function-calling via provider APIs
 *   "conversational" — Chat-optimized, memory-first, single-turn tool use
 *   "react"          — Reason+Act: injects chain-of-thought into prompts
 *
 * Config (from frontend panel):
 *   agentType              — "tools_agent" | "conversational" | "react"
 *   provider               — "openai" | "anthropic" | "gemini" | "deepseek" | "openrouter" | "together" | "perplexity" | "xai" | "fireworks" | "cerebras" | "ollama" | "novita" | "deepinfra" | "hyperbolic"
 *   model                  — Model ID string
 *   prompt                 — User instruction (expression-resolved)
 *   systemPrompt           — Custom persona / system prompt
 *   credentialId           — Vault reference to encrypted API key
 *   outputFormat           — "json" | "text"
 *   temperature            — 0-2 (default 0.3)
 *   maxTokens              — Response token limit (default 4000)
 *   maxIterations          — Agent loop ceiling (default 5, max 15)
 *   returnIntermediateSteps — Include thought/tool log in output
 *
 * Config (injected by cursor executor via handle routing):
 *   _memory  — Array of {role, content} from Memory handle
 *   _tools   — Array of tool definitions from Tools handle
 *
 * Output:
 *   {
 *     result,            — Final text or parsed JSON
 *     model,             — Model ID used
 *     tokensUsed,        — Total tokens across all iterations
 *     provider,          — Provider string
 *     agentType,         — Which strategy ran
 *     iterations,        — How many loops executed
 *     intermediateSteps, — (optional) Array of {thought, tool, input, output}
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

// ── Default Models ───────────────────────────────────────────────────────────
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

// ── Hard Limits ──────────────────────────────────────────────────────────────
const MAX_INPUT_BYTES = 30000;
const MAX_ITERATIONS_CEILING = 15;
const REQUEST_TIMEOUT = 120000;
const MAX_TOOL_OUTPUT_BYTES = 15000;
const TOOL_TIMEOUT_MS = 30000;

// ═════════════════════════════════════════════════════════════════════════════
// AGENT TYPE SYSTEM PROMPTS
// ═════════════════════════════════════════════════════════════════════════════
// Each agent type gets a strategy-specific system prompt prefix that shapes
// how the LLM reasons about tool usage and response structure.

const AGENT_STRATEGY_PROMPTS = {
  tools_agent:
    "You are an autonomous AI agent with access to tools. " +
    "When a user asks a question, decide which tool(s) to call to gather the information needed. " +
    "Call tools as needed, then synthesize the results into a clear final answer. " +
    "Only respond with your final answer when you have all the information you need.",

  conversational:
    "You are a conversational AI assistant. You maintain context from prior messages. " +
    "Respond naturally and helpfully. If tools are available and would help answer the user's question, " +
    "use them — but prefer direct answers when you already have the information.",

  react:
    "You are a ReAct (Reason + Act) agent. For each step:\n" +
    "1. THOUGHT: Explain your reasoning about what to do next.\n" +
    "2. ACTION: Call a tool if needed, or provide your final answer.\n" +
    "3. OBSERVATION: After receiving tool results, reflect on what you learned.\n" +
    "Continue this Thought → Action → Observation loop until you can provide a definitive final answer. " +
    "When you have enough information, respond with your final answer directly.",
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═════════════════════════════════════════════════════════════════════════════

export default {
  async run(config, input, context = {}) {
    // ── Extract Config ─────────────────────────────────────────────────
    const {
      agentType = "tools_agent",
      provider = "openai",
      model,
      prompt,
      systemPrompt,
      credentialId,
      outputFormat = "text",
      temperature = 0.3,
      maxTokens = 4000,
      maxIterations = 5,
      returnIntermediateSteps = false,

      // Handle-routed dependencies (injected by cursor executor)
      _memory,
      _tools,
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

    // ── Resolve Credential ─────────────────────────────────────────────
    const cred = await resolveCredential(
      credentialId,
      context.workspaceId,
      "AI Agent"
    );
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    // ── Resolve Dependencies ───────────────────────────────────────────
    // Memory: array of {role, content} from the Memory handle
    const memoryMessages = resolveMemory(_memory);

    // Tools: array of tool definitions from the Tools handle
    const toolDefs = resolveTools(_tools);
    const formattedTools =
      toolDefs.length > 0
        ? formatToolsForProvider(toolDefs, provider)
        : null;

    // ── Build System Prompt ────────────────────────────────────────────
    // Layer 1: Agent strategy prompt (based on agentType)
    // Layer 2: User's custom system prompt (persona/constraints)
    // Layer 3: Output format instruction (if JSON requested)
    let system = AGENT_STRATEGY_PROMPTS[agentType] || AGENT_STRATEGY_PROMPTS.tools_agent;

    if (systemPrompt) {
      system += `\n\n--- User Instructions ---\n${systemPrompt}`;
    }

    if (outputFormat === "json") {
      system +=
        "\n\nIMPORTANT: Your final answer must be valid JSON. No markdown fences, no explanations — just the JSON object or array.";
    }

    // ── Build Input Context ────────────────────────────────────────────
    const inputSummary =
      typeof input === "string"
        ? input.substring(0, MAX_INPUT_BYTES)
        : JSON.stringify(input, null, 2).substring(0, MAX_INPUT_BYTES);

    // ── Build Initial Message Array ────────────────────────────────────
    const messages = [];

    // Inject memory (conversation history) first
    for (const msg of memoryMessages) {
      messages.push(msg);
    }

    // User message: instruction + input data
    const userContent = inputSummary
      ? `${prompt}\n\n---\nInput Data:\n${inputSummary}`
      : prompt;
    messages.push({ role: "user", content: userContent });

    // ── Agentic Execution Loop ─────────────────────────────────────────
    const maxIter = Math.min(
      Math.max(maxIterations, 1),
      MAX_ITERATIONS_CEILING
    );
    const intermediateSteps = [];
    let totalTokens = 0;
    let iteration = 0;

    while (iteration < maxIter) {
      iteration++;

      // ── Call LLM ───────────────────────────────────────────────────
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

      // ── Check: Did the LLM request tool calls? ─────────────────────
      if (
        response.toolCalls &&
        response.toolCalls.length > 0 &&
        formattedTools
      ) {
        // Append the assistant's tool-call message to the conversation
        messages.push(buildAssistantToolCallMessage(response, provider));

        // Process each tool call
        for (const tc of response.toolCalls) {
          // Log intermediate step (thought + action)
          intermediateSteps.push({
            iteration,
            thought: response.text || null,
            action: tc.name,
            actionInput: tc.arguments,
          });

          // Execute the tool. On failure, the error message is fed
          // back to the LLM so it can adapt — NOT thrown.
          const toolResult = await executeToolCall(tc, toolDefs);

          // Record the observation
          intermediateSteps[intermediateSteps.length - 1].observation =
            toolResult;

          // Append tool result to conversation for the next LLM turn
          messages.push(buildToolResultMessage(tc, toolResult, provider));
        }

        // Continue loop → LLM sees tool results in next iteration
        continue;
      }

      // ── No Tool Calls → Final Response ─────────────────────────────
      let result = response.text;

      if (outputFormat === "json") {
        result = parseJsonResponse(result);
      }

      return buildOutput({
        result,
        model: response.model || resolvedModel,
        tokensUsed: totalTokens,
        provider,
        agentType,
        iterations: iteration,
        intermediateSteps,
        returnIntermediateSteps,
      });
    }

    // ── Max Iterations Exhausted ───────────────────────────────────────
    // The agent couldn't produce a final answer within the budget.
    // Return the last assistant message content if available.
    const lastAssistantMsg = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    const fallbackResult =
      lastAssistantMsg?.content ||
      `Agent completed ${iteration} iterations without a final answer. ` +
      `Consider increasing Max Iterations or simplifying the task.`;

    return buildOutput({
      result:
        outputFormat === "json"
          ? parseJsonResponse(fallbackResult)
          : fallbackResult,
      model: resolvedModel,
      tokensUsed: totalTokens,
      provider,
      agentType,
      iterations: iteration,
      intermediateSteps,
      returnIntermediateSteps,
      warning: "max_iterations_exhausted",
    });
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// DEPENDENCY RESOLUTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Resolve memory from the _memory handle input.
 * Accepts: array of {role, content}, single object, or raw string.
 * Returns: array of {role, content} messages.
 */
function resolveMemory(raw) {
  if (!raw) return [];

  // Already a proper messages array
  if (Array.isArray(raw)) {
    return raw.filter(
      (m) =>
        m &&
        typeof m === "object" &&
        m.role &&
        m.content &&
        typeof m.content === "string"
    );
  }

  // Single message object
  if (typeof raw === "object" && raw.role && raw.content) {
    return [{ role: raw.role, content: raw.content }];
  }

  // Raw string → treat as a user message for context
  if (typeof raw === "string" && raw.trim()) {
    return [{ role: "user", content: raw.trim() }];
  }

  return [];
}

/**
 * Resolve tools from the _tools handle input.
 * Accepts: array of tool definitions or a single tool definition.
 * Each tool must have at minimum: { name, description }.
 * Returns: array of normalized tool definitions.
 */
function resolveTools(raw) {
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
// OUTPUT BUILDER
// ═════════════════════════════════════════════════════════════════════════════

function buildOutput({
  result,
  model,
  tokensUsed,
  provider,
  agentType,
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
    agentType,
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
  switch (provider) {
    case "anthropic":
      return callAnthropic(
        apiKey, model, system, messages, temperature, maxTokens, tools
      );
    case "gemini":
      return callGemini(
        apiKey, model, system, messages, temperature, maxTokens, tools
      );
    case "deepseek":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.deepseek, "DeepSeek"
      );
    case "openrouter":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.openrouter, "OpenRouter"
      );
    case "together":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.together, "Together AI"
      );
    case "perplexity":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.perplexity, "Perplexity"
      );
    case "xai":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.xai, "xAI"
      );
    case "fireworks":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.fireworks, "Fireworks AI"
      );
    case "cerebras":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.cerebras, "Cerebras"
      );
    case "ollama":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.ollama, "Ollama"
      );
    case "novita":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.novita, "Novita AI"
      );
    case "deepinfra":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.deepinfra, "DeepInfra"
      );
    case "hyperbolic":
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.hyperbolic, "Hyperbolic"
      );
    case "openai":
    default:
      return callOpenAICompat(
        apiKey, model, system, messages, temperature, maxTokens, tools,
        ENDPOINTS.openai, "OpenAI"
      );
  }
}

// ── OpenAI-Compatible (OpenAI, DeepSeek, and 10 additional providers) ─────────

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
      timeout: REQUEST_TIMEOUT,
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

// ── Anthropic ────────────────────────────────────────────────────────────────

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
      timeout: REQUEST_TIMEOUT,
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

// ── Google Gemini ────────────────────────────────────────────────────────────

async function callGemini(
  apiKey, model, system, messages, temperature, maxTokens, tools
) {
  const endpoint = `${ENDPOINTS.gemini}/${model}:generateContent?key=${apiKey}`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
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
      tokensUsed:
        (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0),
      toolCalls,
    };
  } catch (err) {
    handleProviderError(err, "Gemini", model);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TOOL CALLING
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Format tool definitions into each provider's native format.
 */
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
      // Gemini formatting handled in callGemini — pass through
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

/**
 * Execute a tool call. If the tool has an inline executor, call it.
 * If not, return a descriptive error that the LLM can reason about.
 *
 * CRITICAL: Errors are caught and returned as messages, never thrown.
 * This lets the agent self-correct: "Tool X failed because Y, let me try Z."
 */
async function executeToolCall(toolCall, toolDefs) {
  const def = toolDefs.find((t) => t.name === toolCall.name);

  if (def && typeof def.execute === "function") {
    try {
      const result = await Promise.race([
        def.execute(toolCall.arguments),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Tool "${toolCall.name}" timed out after ${TOOL_TIMEOUT_MS / 1000}s`)),
            TOOL_TIMEOUT_MS,
          ),
        ),
      ]);
      return result;
    } catch (err) {
      // Feed the error back to the LLM instead of crashing
      return {
        error: true,
        tool: toolCall.name,
        message: `Tool "${toolCall.name}" failed: ${err.message}. You may try a different approach.`,
      };
    }
  }

  // Tool not found or no executor — inform the LLM
  const available = toolDefs.map((t) => t.name).join(", ") || "none";
  return {
    error: true,
    tool: toolCall.name,
    message:
      `Tool "${toolCall.name}" is not available. ` +
      `Available tools: ${available}. ` +
      `Please use one of the available tools or provide your answer directly.`,
  };
}

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
        functionCall: {
          name: tc.name,
          args: tc.arguments,
        },
      });
    }
    return { role: "model", parts };
  }

  // OpenAI / DeepSeek format
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
 * Uses safeStringify to prevent context window explosions from massive payloads.
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

  // OpenAI / DeepSeek format
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
 * Safely stringify a value, handling circular references and enforcing
 * a byte-size ceiling to prevent context window explosions.
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
      `${providerName}: Timed out after ${REQUEST_TIMEOUT / 1000}s. Model may be overloaded.`
    );
  }

  throw new Error(
    `${providerName} failed: ${status || err.code || "unknown"} — ${msg}`
  );
}
