/**
 * MOONSHOT (KIMI) NODE
 *
 * Multi-operation node for Moonshot AI's Kimi models.
 * OpenAI-SDK compatible at https://api.moonshot.ai/v1 — Kimi K2.x family:
 * flagship multimodal (text + image + video in), thinking mode, agentic tool
 * calling, very long context.
 *
 * Genuine API surface (be honest):
 *   chat completions  ✓   vision (K2.5/K2.6 multimodal)  ✓
 *   tool/function calling ✓   thinking / reasoning mode  ✓   JSON mode  ✓
 *   image generation / embeddings / audio  ✗ (not on the public API)
 *
 * Config:
 *   operation    — see OPERATIONS below (default: "message")
 *   model        — Kimi model id (default per operation)
 *   prompt       — instruction / user message
 *   credentialId — Vault reference to the Moonshot API key (type "Moonshot")
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.moonshot.ai/v1";

const DEFAULT_CHAT_MODEL   = "kimi-k2.6";
const DEFAULT_VISION_MODEL = "kimi-k2.6";
const DEFAULT_THINK_MODEL  = "kimi-k2-thinking";
const DEFAULT_CODE_MODEL   = "kimi-k2.7-code";

const KNOWN_MODELS = [
  "kimi-k2.7-code",
  "kimi-k2.6",
  "kimi-k2.5",
  "kimi-k2-thinking",
  "kimi-k2-instruct",
  "moonshot-v1-128k",
  "moonshot-v1-32k",
  "moonshot-v1-8k",
];

async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Moonshot");
}

function authHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

function handleError(err) {
  if (err.message?.startsWith("Moonshot")) throw err;
  const status = err.response?.status;
  const detail = err.response?.data?.error?.message || err.response?.data?.message || err.message;
  if (status === 401) throw new Error("Moonshot: Invalid API key.");
  if (status === 403) throw new Error(`Moonshot: Access denied — ${detail}`);
  if (status === 404) throw new Error(`Moonshot: Model or resource not found — ${detail}`);
  if (status === 429) throw new Error("Moonshot: Rate limit exceeded. Retry later.");
  if (status === 400) throw new Error(`Moonshot: Bad request — ${detail}`);
  if (status >= 500) throw new Error(`Moonshot: Server error (${status}) — ${detail}`);
  throw new Error(`Moonshot: ${status || err.code || "Error"} — ${detail}`);
}

function inputSummary(input) {
  return typeof input === "string"
    ? input
    : JSON.stringify(input, null, 2).substring(0, 15000);
}

function samplingParams(config) {
  const p = {};
  if (config.temperature !== undefined && config.temperature !== "") p.temperature = Number(config.temperature);
  if (config.maxTokens) p.max_tokens = Number(config.maxTokens);
  if (config.topP !== undefined && config.topP !== "") p.top_p = Number(config.topP);
  if (config.frequencyPenalty !== undefined && config.frequencyPenalty !== "") p.frequency_penalty = Number(config.frequencyPenalty);
  if (config.presencePenalty !== undefined && config.presencePenalty !== "") p.presence_penalty = Number(config.presencePenalty);
  if (config.stop) p.stop = String(config.stop).split("\n").map(s => s.trim()).filter(Boolean).slice(0, 4);
  return p;
}

async function chat(apiKey, body, timeout = 120000) {
  const resp = await axios.post(`${BASE}/chat/completions`, body, {
    headers: authHeaders(apiKey),
    timeout,
    maxContentLength: 10 * 1024 * 1024,
  });
  return resp.data;
}

// ── Operation handlers ──────────────────────────────────────────────────────

async function opMessage(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt, outputFormat = "text" } = config;
  if (!prompt) return { success: false, error: "Moonshot message: 'prompt' is required.", skipped: true };

  const systemMessage =
    config.systemPrompt ||
    (outputFormat === "json"
      ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
      : "You are Kimi, a helpful AI assistant by Moonshot AI. Respond clearly and concisely.");

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
    ],
    ...samplingParams({ temperature: config.temperature ?? 0.6, maxTokens: config.maxTokens ?? 2000, ...config }),
    ...(outputFormat === "json" && { response_format: { type: "json_object" } }),
  });

  const choice = data.choices?.[0];
  let result = choice?.message?.content || "";
  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return { result, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, finishReason: choice?.finish_reason, provider: "moonshot", operation: "message" };
}

async function opCode(config, input, apiKey) {
  const { model = DEFAULT_CODE_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "Moonshot code: 'prompt' is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: config.systemPrompt || "You are an expert software engineer. Respond with clean, correct, idiomatic code. Explain only when asked." },
      { role: "user", content: `${prompt}\n\n---\nContext:\n${inputSummary(input)}` },
    ],
    ...samplingParams({ temperature: config.temperature ?? 0.2, maxTokens: config.maxTokens ?? 4000, ...config }),
  });

  return { result: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "code" };
}

async function opStructuredOutput(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "Moonshot structuredOutput: 'prompt' is required.", skipped: true };

  let schemaHint = "";
  if (config.jsonSchema) {
    const schemaStr = typeof config.jsonSchema === "string" ? config.jsonSchema : JSON.stringify(config.jsonSchema);
    schemaHint = `\n\nThe JSON object must conform to this schema:\n${schemaStr}`;
  }

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: `${config.systemPrompt || "You are a structured-data extraction engine."} Always respond with a single valid JSON object — no markdown fences, no prose.${schemaHint}` },
      { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
    ],
    response_format: { type: "json_object" },
    ...samplingParams(config),
  });

  const raw = data.choices?.[0]?.message?.content || "";
  let result = raw;
  try { result = JSON.parse(raw); } catch {
    const stripped = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    try { result = JSON.parse(stripped); } catch { /* leave raw */ }
  }
  return { result, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "structuredOutput" };
}

async function opFunctionCalling(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "Moonshot functionCalling: 'prompt' is required.", skipped: true };

  let tools;
  try {
    tools = typeof config.tools === "string" ? JSON.parse(config.tools) : config.tools;
  } catch {
    return { success: false, error: "Moonshot functionCalling: tools definition is not valid JSON.", skipped: true };
  }
  if (!Array.isArray(tools) || tools.length === 0) {
    return { success: false, error: "Moonshot functionCalling: at least one tool/function is required.", skipped: true };
  }
  const normalized = tools.map(t => (t.type === "function" ? t : { type: "function", function: t }));

  const data = await chat(apiKey, {
    model,
    messages: [
      ...(config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : []),
      { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
    ],
    tools: normalized,
    ...(config.toolChoice ? { tool_choice: config.toolChoice } : {}),
    ...samplingParams(config),
  });

  const message = data.choices?.[0]?.message;
  const calls = (message?.tool_calls || []).map(c => ({
    id: c.id,
    name: c.function?.name,
    arguments: (() => { try { return JSON.parse(c.function?.arguments || "{}"); } catch { return c.function?.arguments; } })(),
  }));

  return {
    toolCalls: calls,
    content: message?.content || "",
    finishReason: data.choices?.[0]?.finish_reason,
    model: data.model || model,
    tokensUsed: data.usage?.total_tokens || 0,
    provider: "moonshot",
    operation: "functionCalling",
  };
}

async function opReasoning(config, input, apiKey) {
  const { model = DEFAULT_THINK_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "Moonshot reasoning: 'prompt' is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: config.systemPrompt || "You are Kimi in thinking mode. Reason carefully step by step before answering." },
      { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
    ],
    ...(config.maxTokens ? { max_tokens: Number(config.maxTokens) } : { max_tokens: 8192 }),
  }, 300000);

  const choice = data.choices?.[0];
  return {
    result: choice?.message?.content || "",
    reasoning: choice?.message?.reasoning_content,
    model: data.model || model,
    tokensUsed: data.usage?.total_tokens || 0,
    provider: "moonshot",
    operation: "reasoning",
  };
}

async function opAnalyzeImage(config, input, apiKey) {
  const { model = DEFAULT_VISION_MODEL } = config;
  const imageUrl = config.imageUrl || input?.imageUrl || input?.url;
  const question = config.question || config.prompt || "Describe this image in detail.";
  if (!imageUrl) return { success: false, error: "Moonshot analyzeImage: 'imageUrl' is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "user", content: [
        { type: "text", text: question },
        { type: "image_url", image_url: { url: imageUrl, ...(config.detail ? { detail: config.detail } : {}) } },
      ]},
    ],
    max_tokens: Number(config.maxTokens || 1024),
    ...(config.temperature !== undefined && config.temperature !== "" ? { temperature: Number(config.temperature) } : {}),
  }, 120000);

  return { result: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "analyzeImage" };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt = "Summarize this document." } = config;
  const documentText = config.documentText || input?.text || input?.content || input?.body || inputSummary(input);
  if (!documentText) return { success: false, error: "Moonshot analyzeDocument: provide 'documentText' or pass document text as input.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are a document analysis assistant. Kimi has very long context — analyze the provided document thoroughly." },
      { role: "user", content: `${prompt}\n\n---\nDocument:\n${String(documentText).substring(0, 200000)}` },
    ],
    ...samplingParams({ temperature: config.temperature ?? 0.3, maxTokens: config.maxTokens ?? 4000, ...config }),
  });

  return { result: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "analyzeDocument" };
}

async function opExtractData(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const source = config.text || input?.text || inputSummary(input);
  const fields = config.fields || config.prompt;
  if (!source) return { success: false, error: "Moonshot extractData: input text is required.", skipped: true };

  const instruction = fields
    ? `Extract the following fields as JSON: ${fields}.`
    : "Extract all meaningful structured data as a flat JSON object.";

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are a data extraction engine. Respond with valid JSON only — no prose, no markdown fences." },
      { role: "user", content: `${instruction}\n\n---\nText:\n${String(source).substring(0, 30000)}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  let result = data.choices?.[0]?.message?.content || "";
  try { result = JSON.parse(result); } catch { /* leave raw */ }
  return { result, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "extractData" };
}

async function opClassify(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const source = config.text || input?.text || inputSummary(input);
  const labels = String(config.labels || config.categories || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!source) return { success: false, error: "Moonshot classify: input text is required.", skipped: true };
  if (labels.length === 0) return { success: false, error: "Moonshot classify: 'labels' (comma-separated) are required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: `Classify the text into exactly one of these labels: ${labels.join(", ")}. Respond with JSON: {"label":"...","confidence":0-1,"reason":"..."}` },
      { role: "user", content: String(source).substring(0, 20000) },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  let result = data.choices?.[0]?.message?.content || "";
  try { result = JSON.parse(result); } catch { /* leave raw */ }
  return { ...(typeof result === "object" ? result : { label: result }), labels, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "classify" };
}

async function opSummarize(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, style = "concise" } = config;
  const source = config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Moonshot summarize: input text is required.", skipped: true };

  const lengthHint = config.maxWords ? ` in about ${config.maxWords} words` : "";
  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: `You are a summarization assistant. Produce a ${style} summary${lengthHint}.` },
      { role: "user", content: String(source).substring(0, 120000) },
    ],
    ...samplingParams({ temperature: config.temperature ?? 0.3, maxTokens: config.maxTokens ?? 1024 }),
  });

  return { summary: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "summarize" };
}

async function opTranslate(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, targetLanguage = "English" } = config;
  const source = config.text || input?.text || (typeof input === "string" ? input : inputSummary(input));
  if (!source) return { success: false, error: "Moonshot translate: input text is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: `You are a professional translator. Translate the user's text into ${targetLanguage}. Return only the translation, no notes.` },
      { role: "user", content: String(source).substring(0, 40000) },
    ],
    temperature: config.temperature ?? 0.2,
  });

  return { translation: data.choices?.[0]?.message?.content || "", targetLanguage, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "translate" };
}

async function opSentiment(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const source = config.text || input?.text || inputSummary(input);
  if (!source) return { success: false, error: "Moonshot sentiment: input text is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: 'Analyze sentiment. Respond with JSON: {"sentiment":"positive|neutral|negative","score":-1..1,"keyPhrases":[],"emotions":[]}' },
      { role: "user", content: String(source).substring(0, 20000) },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  let result = data.choices?.[0]?.message?.content || "";
  try { result = JSON.parse(result); } catch { /* leave raw */ }
  return { ...(typeof result === "object" ? result : { sentiment: result }), model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "sentiment" };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, task } = config;
  const taskDescription = task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "Moonshot generatePrompt: 'task' description is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations." },
      { role: "user", content: `Write an effective AI prompt for this task: ${taskDescription}` },
    ],
    max_tokens: 1024,
    temperature: 0.8,
  });

  return { prompt: data.choices?.[0]?.message?.content || "", tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "generatePrompt" };
}

async function opImprovePrompt(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const originalPrompt = config.prompt || input?.prompt || input?.text || inputSummary(input);
  if (!originalPrompt) return { success: false, error: "Moonshot improvePrompt: 'prompt' to improve is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are an expert prompt engineer. Rewrite and improve the given prompt to be clearer, more specific, and more effective. Return only the improved prompt, no explanations." },
      { role: "user", content: `Improve this prompt:\n\n${originalPrompt}` },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  return { improvedPrompt: data.choices?.[0]?.message?.content || "", originalPrompt, tokensUsed: data.usage?.total_tokens || 0, provider: "moonshot", operation: "improvePrompt" };
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  code: opCode,
  structuredOutput: opStructuredOutput,
  functionCalling: opFunctionCalling,
  reasoning: opReasoning,
  analyzeImage: opAnalyzeImage,
  analyzeDocument: opAnalyzeDocument,
  extractData: opExtractData,
  classify: opClassify,
  summarize: opSummarize,
  translate: opTranslate,
  sentiment: opSentiment,
  generatePrompt: opGeneratePrompt,
  improvePrompt: opImprovePrompt,
};

// Backwards-compat alias for older saved workflows.
OPERATIONS.chat = opMessage;
OPERATIONS.vision = opAnalyzeImage;

// Live model list for the "fetch latest" button. Resolves the saved credential
// server-side — the API key is never exposed to the browser.
export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  try {
    const resp = await axios.get(`${BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 });
    const ids = (resp.data.data || resp.data.models || [])
      .map(m => (typeof m === "string" ? m : m.id))
      .filter(Boolean);
    return ids.length ? ids.sort() : KNOWN_MODELS;
  } catch {
    return KNOWN_MODELS;
  }
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "message";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Moonshot: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId) return { success: false, error: "Moonshot: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Moonshot: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};
