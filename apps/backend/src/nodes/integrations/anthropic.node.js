/**
 * ANTHROPIC NODE
 *
 * Multi-operation Anthropic Claude "subject" node — one node, 15 operations,
 * all driven by the Messages API (the surface Claude actually exposes).
 *
 * Config (common):
 *   operation     — see OPERATIONS below (default: "message")
 *   model         — Claude model id (default per operation, latest June 2026)
 *   credentialId  — Vault reference to the Anthropic API key
 *   prompt        — instruction / user message
 *   systemPrompt  — optional system prompt override
 *   outputFormat  — "json" | "text"
 *   temperature   — 0-1
 *   maxTokens     — max response tokens
 *   topP / topK   — nucleus / top-k sampling
 *   stop          — stop sequences (one per line, max 4)
 *
 * File input (analyzeImage / analyzePdf / extractData):
 *   imageUrl / fileInput — http(s) URL (SSRF-guarded) OR data URI OR raw base64
 *
 * OPERATIONS:
 *   message          — Chat with Claude
 *   structuredOutput — Force a strict JSON shape via a tool definition
 *   functionCalling  — Tool use — Claude picks & fills your tools
 *   extendedThinking — Deep reasoning with a thinking-token budget
 *   analyzeImage     — Vision: describe / answer questions about an image
 *   analyzeDocument  — Analyze long text passed as context
 *   analyzePdf       — Native PDF understanding (document block)
 *   extractData      — Pull structured fields from text or an image
 *   classify         — Categorize input into one of your labels
 *   summarize        — Summarize text with length / style control
 *   translate        — Translate text into a target language
 *   sentiment        — Sentiment + emotion analysis
 *   moderateContent  — Safety review of text against policy
 *   generatePrompt   — Write a prompt for a described task
 *   improvePrompt    — Rewrite a prompt to be clearer & more effective
 *
 * Output varies by operation — see each handler.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODELS_URL = "https://api.anthropic.com/v1/models";
const ANTHROPIC_VERSION = "2023-06-01";
const HEADERS_BASE = { "anthropic-version": ANTHROPIC_VERSION, "Content-Type": "application/json" };

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_FAST_MODEL = "claude-haiku-4-5";
const DEFAULT_VISION_MODEL = "claude-sonnet-4-6";
const DEFAULT_THINKING_MODEL = "claude-opus-4-8";

async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Anthropic");
}

function handleError(err) {
  if (err.message?.startsWith("Anthropic")) throw err;
  if (err.response?.status === 401) throw new Error("Anthropic: Invalid API key. Check your credential in the Vault.");
  if (err.response?.status === 403) throw new Error("Anthropic: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) {
    let model = "unknown";
    try { model = JSON.parse(err.config?.data || "{}")?.model || "unknown"; } catch { /* keep unknown */ }
    throw new Error(`Anthropic: Model "${model}" not found. Try: ${DEFAULT_MODEL}, ${DEFAULT_FAST_MODEL}, claude-opus-4-8.`);
  }
  if (err.response?.status === 400) throw new Error(`Anthropic: Bad request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 422) throw new Error(`Anthropic: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error("Anthropic: Rate limit exceeded. Retry later.");
  if (err.response?.status >= 500) throw new Error(`Anthropic: Server error (${err.response.status}) — try again later.`);
  throw new Error(`Anthropic failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
}

function inputSummary(input) {
  return typeof input === "string" ? input : JSON.stringify(input, null, 2).substring(0, 15000);
}

// Sampling/advanced params common to every Messages call, omitting unset ones.
function samplingParams(config, defaults = {}) {
  const p = {};
  const temperature = config.temperature ?? defaults.temperature;
  if (temperature !== undefined && temperature !== "") p.temperature = Number(temperature);
  if (config.topP !== undefined && config.topP !== "") p.top_p = Number(config.topP);
  if (config.topK !== undefined && config.topK !== "") p.top_k = Number(config.topK);
  if (config.stop) {
    const seqs = String(config.stop).split("\n").map(s => s.trim()).filter(Boolean).slice(0, 4);
    if (seqs.length) p.stop_sequences = seqs;
  }
  return p;
}

// Resolve an image/pdf reference into an Anthropic source block. http(s) is
// SSRF-guarded and downloaded to base64; data URIs and raw base64 pass through.
async function resolveMediaSource(ref, { kind = "image", fallbackMime } = {}) {
  if (!ref || typeof ref !== "string") throw new Error(`Anthropic: ${kind} reference is required.`);

  if (ref.startsWith("data:")) {
    const [meta, data] = ref.split(",");
    const mediaType = meta.replace("data:", "").replace(";base64", "") || fallbackMime;
    return { type: "base64", media_type: mediaType, data };
  }
  if (/^https?:\/\//i.test(ref)) {
    await assertSafeUrlResolved(ref);
    const res = await axios.get(ref, { responseType: "arraybuffer", timeout: 60000, maxContentLength: 32 * 1024 * 1024, maxRedirects: 0 });
    const mediaType = (res.headers["content-type"] || fallbackMime || "").split(";")[0] || fallbackMime;
    return { type: "base64", media_type: mediaType, data: Buffer.from(res.data).toString("base64") };
  }
  // assume raw base64
  return { type: "base64", media_type: fallbackMime, data: ref };
}

async function callAnthropic(apiKey, { model, system, content, maxTokens, sampling = {}, tools, toolChoice, thinking }) {
  const body = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content }],
    ...(system ? { system } : {}),
    ...sampling,
    ...(tools ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    ...(thinking ? { thinking } : {}),
  };
  const response = await axios.post(API_URL, body, {
    headers: { "x-api-key": apiKey, ...HEADERS_BASE },
    timeout: 300000,
    maxContentLength: 32 * 1024 * 1024,
  });
  const blocks = response.data.content || [];
  const text = blocks.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  const thinkingText = blocks.filter(b => b.type === "thinking").map(b => b.thinking).join("\n").trim();
  const toolUses = blocks.filter(b => b.type === "tool_use").map(b => ({ id: b.id, name: b.name, input: b.input }));
  const usage = response.data.usage || {};
  return {
    text,
    thinkingText,
    toolUses,
    raw: response.data,
    model: response.data.model,
    stopReason: response.data.stop_reason,
    tokensUsed: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
  };
}

function maybeJson(text) {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const stripped = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
  try { return JSON.parse(stripped); } catch { return text; }
}

// ── Operation handlers ──────────────────────────────────────────────────────

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

async function opAnalyzeImage(config, input, apiKey) {
  const { model = DEFAULT_VISION_MODEL, prompt = "Describe this image in detail.", maxTokens = 1500 } = config;
  const ref = config.imageUrl || config.fileInput || input?.imageUrl || input?.url || input?.dataUri;
  const source = await resolveMediaSource(ref, { kind: "image", fallbackMime: "image/jpeg" });

  const r = await callAnthropic(apiKey, {
    model,
    system: config.systemPrompt || "You are a helpful vision assistant. Analyze images thoroughly and answer questions accurately.",
    content: [{ type: "image", source }, { type: "text", text: prompt }],
    maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.5 }),
  });

  return { result: r.text, text: r.text, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "analyzeImage" };
}

async function opAnalyzePdf(config, input, apiKey) {
  const { model = DEFAULT_VISION_MODEL, prompt = "Summarize this document.", maxTokens = 4000 } = config;
  const ref = config.fileInput || config.documentUrl || input?.fileInput || input?.dataUri || input?.url;
  const source = await resolveMediaSource(ref, { kind: "pdf", fallbackMime: "application/pdf" });

  const r = await callAnthropic(apiKey, {
    model,
    system: config.systemPrompt || "You are a document analysis assistant. Read the attached PDF thoroughly and answer accurately.",
    content: [{ type: "document", source }, { type: "text", text: prompt }],
    maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.3 }),
  });

  return { result: r.text, text: r.text, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "analyzePdf" };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const { model = DEFAULT_MODEL, prompt = "Summarize this document.", maxTokens = 4000, outputFormat = "text" } = config;
  const documentText = config.documentText || input?.text || input?.content || input?.body || inputSummary(input);
  if (!documentText) throw new Error("Anthropic analyzeDocument: provide 'documentText' or pass document text as input.");

  const system = config.systemPrompt || (outputFormat === "json"
    ? "You are a document analysis assistant. Analyze the provided document and respond with valid JSON only."
    : "You are a document analysis assistant. Analyze the provided document thoroughly and answer questions about it.");

  const r = await callAnthropic(apiKey, {
    model, system, maxTokens: Number(maxTokens),
    content: `${prompt}\n\n---\nDocument:\n${String(documentText).substring(0, 200000)}`,
    sampling: samplingParams(config, { temperature: 0.3 }),
  });

  const result = outputFormat === "json" ? maybeJson(r.text) : r.text;
  return { result, text: typeof result === "string" ? result : JSON.stringify(result), model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "analyzeDocument" };
}

async function opExtractData(config, input, apiKey) {
  const { model = DEFAULT_MODEL, maxTokens = 2000 } = config;
  const fields = config.fields || config.prompt;
  if (!fields) return { success: false, error: "Anthropic extractData: describe the 'fields' to extract.", skipped: true };

  const content = [];
  const imageRef = config.imageUrl || config.fileInput || input?.imageUrl;
  if (imageRef) content.push({ type: "image", source: await resolveMediaSource(imageRef, { kind: "image", fallbackMime: "image/jpeg" }) });
  const sourceText = config.documentText || input?.text || (imageRef ? "" : inputSummary(input));
  content.push({ type: "text", text: `Extract these fields and return ONLY a JSON object: ${fields}\n\n---\nSource:\n${sourceText}` });

  const r = await callAnthropic(apiKey, {
    model,
    system: "You are a precise data-extraction engine. Return ONLY a valid JSON object with the requested fields. Use null for anything missing.",
    content, maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0 }),
  });

  return { result: maybeJson(r.text), model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "extractData" };
}

async function opClassify(config, input, apiKey) {
  const { model = DEFAULT_FAST_MODEL, maxTokens = 200 } = config;
  const labels = String(config.labels || "").split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  if (labels.length < 2) return { success: false, error: "Anthropic classify: provide at least 2 'labels' (comma-separated).", skipped: true };
  const text = config.prompt || config.text || input?.text || inputSummary(input);
  if (!text) return { success: false, error: "Anthropic classify: text to classify is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: `You are a classifier. Classify the input into exactly one of these categories: ${labels.join(", ")}. Respond with ONLY the category name, nothing else.`,
    content: String(text).substring(0, 20000), maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0 }),
  });

  const raw = r.text.trim();
  const matched = labels.find(l => l.toLowerCase() === raw.toLowerCase()) || labels.find(l => raw.toLowerCase().includes(l.toLowerCase())) || raw;
  return { label: matched, confident: labels.includes(matched), labels, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "classify" };
}

async function opSummarize(config, input, apiKey) {
  const { model = DEFAULT_MODEL, maxTokens = 1500, length = "medium", style = "paragraph" } = config;
  const text = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!text) return { success: false, error: "Anthropic summarize: text to summarize is required.", skipped: true };

  const lengthHint = { short: "in 1-2 sentences", medium: "in a short paragraph", long: "in several detailed paragraphs" }[length] || "concisely";
  const styleHint = style === "bullets" ? "as a bulleted list" : style === "tldr" ? "as a single TL;DR line" : "as flowing prose";

  const r = await callAnthropic(apiKey, {
    model,
    system: `You are an expert summarizer. Summarize the input ${lengthHint}, ${styleHint}. Capture the key points faithfully.`,
    content: String(text).substring(0, 200000), maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.4 }),
  });

  return { summary: r.text, result: r.text, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "summarize" };
}

async function opTranslate(config, input, apiKey) {
  const { model = DEFAULT_MODEL, maxTokens = 4000, targetLanguage = "English" } = config;
  const text = config.prompt || config.text || input?.text || inputSummary(input);
  if (!text) return { success: false, error: "Anthropic translate: text to translate is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: `You are a professional translator. Translate the input into ${targetLanguage}. Preserve tone, formatting and meaning. Return ONLY the translation.`,
    content: String(text).substring(0, 100000), maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.3 }),
  });

  return { translation: r.text, result: r.text, targetLanguage, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "translate" };
}

async function opSentiment(config, input, apiKey) {
  const { model = DEFAULT_FAST_MODEL, maxTokens = 400 } = config;
  const text = config.prompt || config.text || input?.text || inputSummary(input);
  if (!text) return { success: false, error: "Anthropic sentiment: text to analyze is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: 'You are a sentiment analysis engine. Return ONLY a JSON object: {"sentiment":"positive|negative|neutral|mixed","score":-1..1,"emotions":["..."],"summary":"..."}',
    content: String(text).substring(0, 20000), maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0 }),
  });

  return { result: maybeJson(r.text), model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "sentiment" };
}

async function opModerateContent(config, input, apiKey) {
  const { model = DEFAULT_FAST_MODEL, maxTokens = 400 } = config;
  const text = config.prompt || config.text || input?.text || inputSummary(input);
  if (!text) return { success: false, error: "Anthropic moderateContent: text to moderate is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: 'You are a content safety classifier. Review the input and return ONLY JSON: {"flagged":bool,"categories":{"hate":bool,"harassment":bool,"violence":bool,"self_harm":bool,"sexual":bool,"illicit":bool},"reason":"..."}',
    content: String(text).substring(0, 20000), maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0 }),
  });

  const parsed = maybeJson(r.text);
  return { flagged: parsed?.flagged || false, categories: parsed?.categories || {}, reason: parsed?.reason, result: parsed, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "moderateContent" };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = DEFAULT_FAST_MODEL, maxTokens = 1000 } = config;
  const taskDescription = config.task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "Anthropic generatePrompt: 'task' description is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations.",
    content: `Write an effective AI prompt for this task: ${taskDescription}`, maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.8 }),
  });

  return { prompt: r.text, result: r.text, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "generatePrompt" };
}

async function opImprovePrompt(config, input, apiKey) {
  const { model = DEFAULT_FAST_MODEL, maxTokens = 1000 } = config;
  const originalPrompt = config.prompt || input?.prompt || input?.text || inputSummary(input);
  if (!originalPrompt) return { success: false, error: "Anthropic improvePrompt: 'prompt' to improve is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: "You are an expert prompt engineer. Rewrite and improve the given prompt to be clearer, more specific, and more effective. Return only the improved prompt, no explanations.",
    content: `Improve this prompt:\n\n${originalPrompt}`, maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.7 }),
  });

  return { improvedPrompt: r.text, result: r.text, originalPrompt, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "improvePrompt" };
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  structuredOutput: opStructuredOutput,
  functionCalling: opFunctionCalling,
  extendedThinking: opExtendedThinking,
  analyzeImage: opAnalyzeImage,
  analyzeDocument: opAnalyzeDocument,
  analyzePdf: opAnalyzePdf,
  extractData: opExtractData,
  classify: opClassify,
  summarize: opSummarize,
  translate: opTranslate,
  sentiment: opSentiment,
  moderateContent: opModerateContent,
  generatePrompt: opGeneratePrompt,
  improvePrompt: opImprovePrompt,
};

// Live model list for the "fetch latest" button. Resolves the saved credential
// server-side — the API key is never exposed to the browser.
export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  const response = await axios.get(MODELS_URL, {
    headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
    timeout: 30000,
  });
  return (response.data.data || [])
    .map(m => m.id)
    .filter(Boolean)
    .sort();
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "message";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Anthropic: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId) return { success: false, error: "Anthropic: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Anthropic: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};
