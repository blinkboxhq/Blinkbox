/**
 * Anthropic — core chat/messages operations: single-turn message, multi-turn
 * conversation, structured (schema-tool) output, function calling, extended
 * thinking, prompt caching, token counting, citations, and the model list.
 * Handlers receive `(config, input, apiKey)`. Bodies moved verbatim from the
 * monolith.
 */
import axios from "axios";
import {
  API_URL, MODELS_URL, HEADERS_BASE, ANTHROPIC_VERSION,
  DEFAULT_MODEL, DEFAULT_THINKING_MODEL,
  callAnthropic, samplingParams, inputSummary, maybeJson,
} from "../GenericFunctions.js";

async function opMessage(config, input, apiKey) {
  const { model = DEFAULT_MODEL, prompt, outputFormat = "text", maxTokens = 2000 } = config;
  if (!prompt) return { success: false, error: "Anthropic message: 'prompt' is required.", skipped: true };

  const system = config.systemPrompt ||
    (outputFormat === "json"
      ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
      : "You are a helpful assistant. Respond clearly and concisely.");

  const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`;
  const r = await callAnthropic(apiKey, {
    model, system, content: userMessage, maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.7 }),
  });

  const result = outputFormat === "json" ? maybeJson(r.text) : r.text;
  return { result, text: typeof result === "string" ? result : JSON.stringify(result), model: r.model, tokensUsed: r.tokensUsed, stopReason: r.stopReason, provider: "anthropic", operation: "message" };
}

async function opStructuredOutput(config, input, apiKey) {
  const { model = DEFAULT_MODEL, prompt, maxTokens = 2000 } = config;
  if (!prompt) return { success: false, error: "Anthropic structuredOutput: 'prompt' is required.", skipped: true };

  let schema;
  try { schema = typeof config.jsonSchema === "string" ? JSON.parse(config.jsonSchema) : config.jsonSchema; }
  catch { return { success: false, error: "Anthropic structuredOutput: jsonSchema is not valid JSON.", skipped: true }; }
  if (!schema || typeof schema !== "object") return { success: false, error: "Anthropic structuredOutput: a JSON schema is required.", skipped: true };

  const toolName = config.schemaName || "respond";
  const tools = [{ name: toolName, description: "Return the result in the required structure.", input_schema: schema }];

  const r = await callAnthropic(apiKey, {
    model, system: config.systemPrompt, maxTokens: Number(maxTokens),
    content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`,
    tools, toolChoice: { type: "tool", name: toolName },
    sampling: samplingParams(config),
  });

  const result = r.toolUses[0]?.input ?? maybeJson(r.text);
  return { result, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "structuredOutput" };
}

async function opFunctionCalling(config, input, apiKey) {
  const { model = DEFAULT_MODEL, prompt, maxTokens = 2000 } = config;
  if (!prompt) return { success: false, error: "Anthropic functionCalling: 'prompt' is required.", skipped: true };

  let tools;
  try { tools = typeof config.tools === "string" ? JSON.parse(config.tools) : config.tools; }
  catch { return { success: false, error: "Anthropic functionCalling: tools definition is not valid JSON.", skipped: true }; }
  if (!Array.isArray(tools) || tools.length === 0) return { success: false, error: "Anthropic functionCalling: at least one tool is required.", skipped: true };
  // Normalize OpenAI-style { name, description, parameters } into Anthropic { name, description, input_schema }.
  const normalized = tools.map(t => t.input_schema ? t : { name: t.name, description: t.description, input_schema: t.parameters || t.input_schema || { type: "object", properties: {} } });

  const toolChoice = config.toolChoice === "required" ? { type: "any" }
    : config.toolChoice === "none" ? undefined
    : { type: "auto" };

  const r = await callAnthropic(apiKey, {
    model, system: config.systemPrompt, maxTokens: Number(maxTokens),
    content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`,
    tools: normalized, toolChoice,
    sampling: samplingParams(config),
  });

  return { toolCalls: r.toolUses, content: r.text, stopReason: r.stopReason, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "functionCalling" };
}

async function opExtendedThinking(config, input, apiKey) {
  const { model = DEFAULT_THINKING_MODEL, prompt, maxTokens = 16000 } = config;
  if (!prompt) return { success: false, error: "Anthropic extendedThinking: 'prompt' is required.", skipped: true };

  const budget = Math.max(1024, Math.min(Number(config.thinkingBudget) || 8000, Number(maxTokens) - 512));
  const r = await callAnthropic(apiKey, {
    model, system: config.systemPrompt, maxTokens: Number(maxTokens),
    content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`,
    thinking: { type: "enabled", budget_tokens: budget },
  });

  return { result: r.text, thinking: r.thinkingText, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "extendedThinking" };
}

async function opMultiTurn(config, input, apiKey) {
  const { model = DEFAULT_MODEL, maxTokens = 2000 } = config;
  let messages;
  try { messages = typeof config.messages === "string" ? JSON.parse(config.messages) : config.messages; }
  catch { return { success: false, error: "Anthropic multiTurn: 'messages' is not valid JSON.", skipped: true }; }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { success: false, error: "Anthropic multiTurn: a non-empty messages array is required.", skipped: true };
  }
  const body = {
    model, max_tokens: Number(maxTokens), messages,
    ...(config.systemPrompt ? { system: config.systemPrompt } : {}),
    ...samplingParams(config, { temperature: 0.7 }),
  };
  const response = await axios.post(API_URL, body, {
    headers: { "x-api-key": apiKey, ...HEADERS_BASE }, timeout: 300000, maxContentLength: 32 * 1024 * 1024,
  });
  const blocks = response.data.content || [];
  const text = blocks.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  const usage = response.data.usage || {};
  return { result: text, text, stopReason: response.data.stop_reason, model: response.data.model, tokensUsed: (usage.input_tokens || 0) + (usage.output_tokens || 0), provider: "anthropic", operation: "multiTurn" };
}

async function opCountTokens(config, input, apiKey) {
  const { model = DEFAULT_MODEL } = config;
  const text = config.prompt || config.text || (typeof input === "string" ? input : inputSummary(input));
  if (!text) return { success: false, error: "Anthropic countTokens: text is required.", skipped: true };
  const body = {
    model, messages: [{ role: "user", content: text }],
    ...(config.systemPrompt ? { system: config.systemPrompt } : {}),
  };
  const response = await axios.post("https://api.anthropic.com/v1/messages/count_tokens", body, {
    headers: { "x-api-key": apiKey, ...HEADERS_BASE }, timeout: 120000,
  });
  return { inputTokens: response.data.input_tokens, model, provider: "anthropic", operation: "countTokens" };
}

async function opCitations(config, input, apiKey) {
  const { model = DEFAULT_MODEL, maxTokens = 2000 } = config;
  const document = config.document || (typeof input === "string" ? input : input?.document || inputSummary(input));
  const question = config.prompt || config.question;
  if (!document || !question) return { success: false, error: "Anthropic citations: both 'document' and a question are required.", skipped: true };
  const content = [
    { type: "document", source: { type: "text", media_type: "text/plain", data: String(document) }, title: config.title || "Source", citations: { enabled: true } },
    { type: "text", text: question },
  ];
  const body = { model, max_tokens: Number(maxTokens), messages: [{ role: "user", content }], ...samplingParams(config) };
  const response = await axios.post(API_URL, body, {
    headers: { "x-api-key": apiKey, ...HEADERS_BASE }, timeout: 300000, maxContentLength: 32 * 1024 * 1024,
  });
  const blocks = response.data.content || [];
  const text = blocks.filter(b => b.type === "text").map(b => b.text).join("").trim();
  const citations = blocks.flatMap(b => b.citations || []);
  const usage = response.data.usage || {};
  return { result: text, text, citations, model: response.data.model, tokensUsed: (usage.input_tokens || 0) + (usage.output_tokens || 0), provider: "anthropic", operation: "citations" };
}

async function opPromptCaching(config, input, apiKey) {
  const { model = DEFAULT_MODEL, maxTokens = 1000 } = config;
  const context = config.context || (typeof input === "string" ? input : inputSummary(input));
  const prompt = config.prompt;
  if (!context || !prompt) return { success: false, error: "Anthropic promptCaching: both cached 'context' and a 'prompt' are required.", skipped: true };
  const body = {
    model, max_tokens: Number(maxTokens),
    system: [{ type: "text", text: String(context), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt }],
    ...samplingParams(config),
  };
  const response = await axios.post(API_URL, body, {
    headers: { "x-api-key": apiKey, ...HEADERS_BASE }, timeout: 300000, maxContentLength: 32 * 1024 * 1024,
  });
  const blocks = response.data.content || [];
  const text = blocks.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  const usage = response.data.usage || {};
  return {
    result: text, text,
    cacheCreationTokens: usage.cache_creation_input_tokens || 0,
    cacheReadTokens: usage.cache_read_input_tokens || 0,
    model: response.data.model, tokensUsed: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    provider: "anthropic", operation: "promptCaching",
  };
}

async function opListModels(config, input, apiKey) {
  const response = await axios.get(MODELS_URL, {
    headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION }, timeout: 120000,
  });
  const models = (response.data.data || []).map(m => ({ id: m.id, displayName: m.display_name, createdAt: m.created_at }));
  return { models, count: models.length, provider: "anthropic", operation: "listModels" };
}

export const chatOperations = {
  message: opMessage,
  multiTurn: opMultiTurn,
  structuredOutput: opStructuredOutput,
  functionCalling: opFunctionCalling,
  extendedThinking: opExtendedThinking,
  citations: opCitations,
  promptCaching: opPromptCaching,
  countTokens: opCountTokens,
  listModels: opListModels,
};
