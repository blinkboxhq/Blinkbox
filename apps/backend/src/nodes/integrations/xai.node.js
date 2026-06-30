/**
 * XAI (GROK) NODE
 *
 * Multi-operation xAI / Grok node. OpenAI-SDK compatible at https://api.x.ai/v1.
 *
 * Config:
 *   operation    — see OPERATIONS below (default: "message")
 *   model        — model id (default per operation)
 *   prompt       — instruction / user message (most operations)
 *   credentialId — Vault reference to the xAI API key
 *   temperature  — 0-2
 *   maxTokens    — max response tokens
 *
 *   ── analyzeImage ──
 *   imageUrl     — public URL or base64 data URI of the image
 *
 *   ── generateImage ──
 *   imagePrompt  — text description of the image to generate
 *   n            — number of images (1-10)
 *
 *   ── liveSearch ──
 *   searchMode   — "auto" | "on" | "off" — Grok server-side web search
 *   searchSources, maxSearchResults, searchRecency
 *
 * OPERATIONS:
 *   message          — Chat completion (Grok 4.x)
 *   structuredOutput — JSON-schema constrained output
 *   functionCalling  — Tool/function calling
 *   reasoning        — Extended reasoning (Grok reasoning models)
 *   liveSearch       — Chat grounded in real-time web search
 *   analyzeImage     — Vision: describe / answer about an image
 *   generateImage    — grok-2-image text-to-image
 *   analyzeDocument  — Send document text as context + ask a question
 *   extractData      — Pull structured fields from unstructured text
 *   classify         — Classify input into one of given labels
 *   summarize        — Summarize input text
 *   translate        — Translate input to a target language
 *   sentiment        — Sentiment + key-phrase analysis
 *   generatePrompt   — Write an effective prompt for a task
 *   improvePrompt    — Rewrite/improve an existing prompt
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

const BASE = "https://api.x.ai/v1";

const DEFAULT_CHAT_MODEL = "grok-4.3";
const DEFAULT_REASON_MODEL = "grok-4.20";
const DEFAULT_VISION_MODEL = "grok-4.3";
const DEFAULT_IMAGE_MODEL = "grok-2-image";

const KNOWN_MODELS = [
  "grok-4.3",
  "grok-4.20",
  "grok-4-fast",
  "grok-4.1",
  "grok-4",
  "grok-3",
  "grok-3-mini",
  "grok-code-fast",
  "grok-2-vision",
  "grok-2-image",
];

async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "xAI");
}

function handleError(err) {
  if (err.message?.startsWith("xAI")) throw err;
  if (err.response?.status === 401) throw new Error("xAI: Invalid API key.");
  if (err.response?.status === 403) throw new Error("xAI: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) throw new Error(`xAI: Resource not found — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 422) throw new Error(`xAI: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error("xAI: Rate limit / quota exceeded — check console.x.ai.");
  if (err.response?.status === 400) throw new Error(`xAI: Bad request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status >= 500) throw new Error(`xAI: Server error (${err.response.status}) — try again later.`);
  throw new Error(`xAI failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
}

function inputSummary(input) {
  return typeof input === "string"
    ? input
    : JSON.stringify(input, null, 2).substring(0, 15000);
}

async function resolveInlineRef(ref, label = "file") {
  if (!ref || typeof ref !== "string") throw new Error(`xAI: ${label} is required.`);
  if (ref.startsWith("data:")) return ref;
  if (/^https?:\/\//i.test(ref)) { await assertSafeUrlResolved(ref); return ref; }
  throw new Error(`xAI: ${label} must be an http/https URL or base64 data URI.`);
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

function authHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

async function chat(apiKey, body, timeout = 120000) {
  const response = await axios.post(`${BASE}/chat/completions`, body, { headers: authHeaders(apiKey), timeout });
  return response.data;
}

// ── Operation handlers ──────────────────────────────────────────────────────

async function opMessage(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt, outputFormat = "text" } = config;
  if (!prompt) return { success: false, error: "xAI message: 'prompt' is required.", skipped: true };

  const systemMessage =
    config.systemPrompt ||
    (outputFormat === "json"
      ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
      : "You are a helpful assistant. Respond clearly and concisely.");

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
    ],
    ...samplingParams({ temperature: config.temperature ?? 0.7, maxTokens: config.maxTokens ?? 2000, ...config }),
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

  return { result, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, finishReason: choice?.finish_reason, provider: "xai", operation: "message" };
}

async function opStructuredOutput(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "xAI structuredOutput: 'prompt' is required.", skipped: true };

  let schema;
  try {
    schema = typeof config.jsonSchema === "string" ? JSON.parse(config.jsonSchema) : config.jsonSchema;
  } catch {
    return { success: false, error: "xAI structuredOutput: jsonSchema is not valid JSON.", skipped: true };
  }
  if (!schema || typeof schema !== "object") {
    return { success: false, error: "xAI structuredOutput: a JSON schema is required.", skipped: true };
  }

  const data = await chat(apiKey, {
    model,
    messages: [
      ...(config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : []),
      { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: config.schemaName || "result", strict: config.strict !== false, schema },
    },
    ...samplingParams(config),
  });

  const raw = data.choices?.[0]?.message?.content || "";
  let result = raw;
  try { result = JSON.parse(raw); } catch { /* leave raw */ }
  return { result, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "structuredOutput" };
}

async function opFunctionCalling(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "xAI functionCalling: 'prompt' is required.", skipped: true };

  let tools;
  try {
    tools = typeof config.tools === "string" ? JSON.parse(config.tools) : config.tools;
  } catch {
    return { success: false, error: "xAI functionCalling: tools definition is not valid JSON.", skipped: true };
  }
  if (!Array.isArray(tools) || tools.length === 0) {
    return { success: false, error: "xAI functionCalling: at least one tool/function is required.", skipped: true };
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
    provider: "xai",
    operation: "functionCalling",
  };
}

async function opReasoning(config, input, apiKey) {
  const { model = DEFAULT_REASON_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "xAI reasoning: 'prompt' is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      ...(config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : []),
      { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
    ],
    ...(config.reasoningEffort ? { reasoning_effort: config.reasoningEffort } : {}),
    ...(config.maxTokens ? { max_tokens: Number(config.maxTokens) } : {}),
  }, 300000);

  const choice = data.choices?.[0];
  return {
    result: choice?.message?.content || "",
    reasoning: choice?.message?.reasoning_content,
    model: data.model || model,
    tokensUsed: data.usage?.total_tokens || 0,
    reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens,
    provider: "xai",
    operation: "reasoning",
  };
}

async function opLiveSearch(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt, searchMode = "auto" } = config;
  if (!prompt) return { success: false, error: "xAI liveSearch: 'prompt' is required.", skipped: true };

  const search_parameters = { mode: searchMode };
  if (config.maxSearchResults) search_parameters.max_search_results = Number(config.maxSearchResults);
  if (config.returnCitations !== false) search_parameters.return_citations = true;
  const sources = [];
  if (config.searchSources) {
    String(config.searchSources).split(",").map(s => s.trim()).filter(Boolean).forEach(s => sources.push({ type: s }));
  }
  if (config.searchDomains) {
    const allowed = String(config.searchDomains).split(",").map(s => s.trim()).filter(Boolean);
    if (allowed.length) sources.push({ type: "web", allowed_websites: allowed.slice(0, 5) });
  }
  if (sources.length) search_parameters.sources = sources;
  if (config.searchFromDate) search_parameters.from_date = config.searchFromDate;
  if (config.searchToDate) search_parameters.to_date = config.searchToDate;

  const data = await chat(apiKey, {
    model,
    messages: [
      ...(config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : []),
      { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
    ],
    search_parameters,
    ...samplingParams(config),
  });

  const choice = data.choices?.[0];
  return {
    result: choice?.message?.content || "",
    citations: data.citations || choice?.message?.citations || [],
    model: data.model || model,
    tokensUsed: data.usage?.total_tokens || 0,
    numSourcesUsed: data.usage?.num_sources_used,
    provider: "xai",
    operation: "liveSearch",
  };
}

async function opAnalyzeImage(config, input, apiKey) {
  const { model = DEFAULT_VISION_MODEL, prompt = "Describe this image in detail.", detail = "auto" } = config;
  const ref = config.imageUrl || config.fileInput || input?.imageUrl || input?.url || input?.dataUri;
  const url = await resolveInlineRef(ref, "imageUrl");

  const data = await chat(apiKey, {
    model,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url, detail } },
      ],
    }],
    ...samplingParams({ maxTokens: config.maxTokens ?? 1000, ...config }),
  });

  return { result: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "analyzeImage" };
}

async function opGenerateImage(config, input, apiKey) {
  const { model = DEFAULT_IMAGE_MODEL, imagePrompt, prompt, n = 1 } = config;
  const description = imagePrompt || prompt || input?.prompt || input?.description;
  if (!description) return { success: false, error: "xAI generateImage: 'imagePrompt' is required.", skipped: true };

  const response = await axios.post(
    `${BASE}/images/generations`,
    {
      model,
      prompt: description,
      n: Math.min(Math.max(parseInt(n) || 1, 1), 10),
      response_format: "b64_json",
    },
    { headers: authHeaders(apiKey), timeout: 180000 },
  );

  const data = response.data.data || [];
  const files = data.map((d, i) => ({
    filename: `xai-image-${Date.now()}-${i}.jpg`,
    contentType: "image/jpeg",
    base64: d.b64_json,
    dataUri: d.b64_json ? `data:image/jpeg;base64,${d.b64_json}` : undefined,
    url: d.url,
    revisedPrompt: d.revised_prompt,
  }));
  const first = files[0];

  return {
    filename: first?.filename,
    contentType: "image/jpeg",
    base64: first?.base64,
    dataUri: first?.dataUri || first?.url,
    imageUrl: first?.url,
    revisedPrompt: data[0]?.revised_prompt,
    files,
    model,
    provider: "xai",
    operation: "generateImage",
  };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt = "Summarize this document.", maxTokens = 4000 } = config;
  const documentText = config.documentText || input?.text || input?.content || input?.body || inputSummary(input);
  if (!documentText) throw new Error("xAI analyzeDocument: provide 'documentText' or pass document text as input.");

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are a document analysis assistant. Analyze the provided document thoroughly and answer questions about it." },
      { role: "user", content: `${prompt}\n\n---\nDocument:\n${String(documentText).substring(0, 30000)}` },
    ],
    max_tokens: Number(maxTokens),
    temperature: config.temperature ?? 0.3,
  });

  return { result: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "analyzeDocument" };
}

async function opExtractData(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const source = config.text || input?.text || inputSummary(input);
  const fields = config.fields || config.prompt;
  if (!source) return { success: false, error: "xAI extractData: input text is required.", skipped: true };

  const instruction = fields
    ? `Extract the following fields as JSON: ${fields}.`
    : "Extract all meaningful structured data as a flat JSON object.";

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are a data extraction engine. Respond with valid JSON only — no prose, no markdown fences." },
      { role: "user", content: `${instruction}\n\n---\nText:\n${String(source).substring(0, 20000)}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  let result = data.choices?.[0]?.message?.content || "";
  try { result = JSON.parse(result); } catch { /* leave raw */ }
  return { result, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "extractData" };
}

async function opClassify(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const source = config.text || input?.text || inputSummary(input);
  const labels = String(config.labels || config.categories || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!source) return { success: false, error: "xAI classify: input text is required.", skipped: true };
  if (labels.length === 0) return { success: false, error: "xAI classify: 'labels' (comma-separated) are required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: `Classify the text into exactly one of these labels: ${labels.join(", ")}. Respond with JSON: {"label": "...", "confidence": 0-1, "reason": "..."}` },
      { role: "user", content: String(source).substring(0, 15000) },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  let result = data.choices?.[0]?.message?.content || "";
  try { result = JSON.parse(result); } catch { /* leave raw */ }
  return { ...(typeof result === "object" ? result : { label: result }), labels, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "classify" };
}

async function opSummarize(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, style = "concise" } = config;
  const source = config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "xAI summarize: input text is required.", skipped: true };

  const lengthHint = config.maxWords ? ` in about ${config.maxWords} words` : "";
  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: `You are a summarization assistant. Produce a ${style} summary${lengthHint}.` },
      { role: "user", content: String(source).substring(0, 30000) },
    ],
    ...samplingParams({ temperature: config.temperature ?? 0.3, maxTokens: config.maxTokens ?? 1000 }),
  });

  return { summary: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "summarize" };
}

async function opTranslate(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, targetLanguage = "English" } = config;
  const source = config.text || input?.text || (typeof input === "string" ? input : inputSummary(input));
  if (!source) return { success: false, error: "xAI translate: input text is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: `You are a professional translator. Translate the user's text into ${targetLanguage}. Return only the translation, no notes.` },
      { role: "user", content: String(source).substring(0, 20000) },
    ],
    temperature: config.temperature ?? 0.2,
  });

  return { translation: data.choices?.[0]?.message?.content || "", targetLanguage, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "translate" };
}

async function opSentiment(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const source = config.text || input?.text || inputSummary(input);
  if (!source) return { success: false, error: "xAI sentiment: input text is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: 'Analyze sentiment. Respond with JSON: {"sentiment":"positive|neutral|negative","score":-1..1,"keyPhrases":[],"emotions":[]}' },
      { role: "user", content: String(source).substring(0, 15000) },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  let result = data.choices?.[0]?.message?.content || "";
  try { result = JSON.parse(result); } catch { /* leave raw */ }
  return { ...(typeof result === "object" ? result : { sentiment: result }), model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "sentiment" };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, task } = config;
  const taskDescription = task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "xAI generatePrompt: 'task' description is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations." },
      { role: "user", content: `Write an effective AI prompt for this task: ${taskDescription}` },
    ],
    max_tokens: 1000,
    temperature: 0.8,
  });

  return { prompt: data.choices?.[0]?.message?.content || "", tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "generatePrompt" };
}

async function opImprovePrompt(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const originalPrompt = config.prompt || input?.prompt || input?.text || inputSummary(input);
  if (!originalPrompt) return { success: false, error: "xAI improvePrompt: 'prompt' to improve is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are an expert prompt engineer. Rewrite and improve the given prompt to be clearer, more specific, and more effective. Return only the improved prompt, no explanations." },
      { role: "user", content: `Improve this prompt:\n\n${originalPrompt}` },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  return { improvedPrompt: data.choices?.[0]?.message?.content || "", originalPrompt, tokensUsed: data.usage?.total_tokens || 0, provider: "xai", operation: "improvePrompt" };
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  structuredOutput: opStructuredOutput,
  functionCalling: opFunctionCalling,
  reasoning: opReasoning,
  liveSearch: opLiveSearch,
  analyzeImage: opAnalyzeImage,
  generateImage: opGenerateImage,
  analyzeDocument: opAnalyzeDocument,
  extractData: opExtractData,
  classify: opClassify,
  summarize: opSummarize,
  translate: opTranslate,
  sentiment: opSentiment,
  generatePrompt: opGeneratePrompt,
  improvePrompt: opImprovePrompt,
};

// Live model list for the "fetch latest" button. Resolves the saved credential
// server-side — the API key is never exposed to the browser.
export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  try {
    const response = await axios.get(`${BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 });
    const ids = (response.data.data || response.data.models || [])
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
    if (!handler) throw new Error(`xAI: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId) return { success: false, error: "xAI: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `xAI: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};
