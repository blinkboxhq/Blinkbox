/**
 * PERPLEXITY NODE
 *
 * Multi-operation Perplexity (Sonar) node. OpenAI-compatible chat-completions
 * API with live web-search grounding and citations.
 *
 * One subject node exposing 15 distinct operations, dispatched by
 * `config.operation` (default: "message").
 *
 * Credential: getOAuthToken(credentialId, workspaceId, "Perplexity") → API key.
 *
 * OPERATIONS:
 *   message          — Grounded chat (web search baked in)
 *   search           — Answer a question with explicit web search + citations
 *   askWithCitations — Same as search, citations-forward shape
 *   structuredOutput — Force a strict JSON schema on the response
 *   reasoning        — Step-by-step reasoning (sonar-reasoning-pro)
 *   deepResearch     — Long-form, source-dense research report
 *   factCheck        — Verify a claim against current sources
 *   compare          — Compare two or more things with sources
 *   newsDigest       — Summarize the latest news on a topic
 *   extractData      — Pull structured fields out of text
 *   classify         — Label text into one of N categories
 *   summarize        — Summarize long text
 *   translate        — Translate text between languages
 *   analyzeDocument  — Ask questions about a long document / text
 *   generatePrompt   — Write an effective prompt for a task
 *
 * Output varies by operation.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API_URL = "https://api.perplexity.ai/chat/completions";

async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Perplexity");
}

function handleError(err) {
  if (err.message?.startsWith("Perplexity")) throw err;
  const msg = err.response?.data?.error?.message || err.message;
  if (err.response?.status === 400) throw new Error(`Perplexity: Bad request — ${msg}`);
  if (err.response?.status === 401) throw new Error("Perplexity: Invalid API key.");
  if (err.response?.status === 403) throw new Error("Perplexity: Access forbidden — check your API key permissions.");
  if (err.response?.status === 404) throw new Error("Perplexity: Resource not found — check the model name.");
  if (err.response?.status === 422) throw new Error(`Perplexity: Unprocessable request — ${msg}`);
  if (err.response?.status === 429) throw new Error("Perplexity: Rate limit exceeded. Retry later.");
  if (err.response?.status >= 500) throw new Error(`Perplexity: Server error (${err.response.status}) — try again later.`);
  throw new Error(`Perplexity failed: ${err.response?.status || err.code} — ${msg}`);
}

function inputSummary(input) {
  return typeof input === "string" ? input : JSON.stringify(input, null, 2).substring(0, 15000);
}

function maybeJson(text) {
  if (typeof text !== "string") return text;
  try { return JSON.parse(text); } catch { /* fall through */ }
  const stripped = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(stripped); } catch { return text; }
}

function samplingBody(config, defaults = {}) {
  const body = {};
  const temperature = config.temperature ?? defaults.temperature;
  const maxTokens = config.maxTokens ?? defaults.maxTokens;
  if (temperature !== undefined && temperature !== "") body.temperature = Number(temperature);
  if (maxTokens !== undefined && maxTokens !== "") body.max_tokens = Number(maxTokens);
  if (config.topP !== undefined && config.topP !== "") body.top_p = Number(config.topP);
  if (config.topK !== undefined && config.topK !== "") body.top_k = Number(config.topK);
  if (config.presencePenalty !== undefined && config.presencePenalty !== "") body.presence_penalty = Number(config.presencePenalty);
  if (config.frequencyPenalty !== undefined && config.frequencyPenalty !== "") body.frequency_penalty = Number(config.frequencyPenalty);
  return body;
}

// Search-domain / recency filters apply to grounded ops.
function searchFilters(config) {
  const extra = {};
  if (config.searchRecency) extra.search_recency_filter = config.searchRecency;
  if (config.searchDomains) {
    const domains = String(config.searchDomains).split(/[\n,]/).map(d => d.trim()).filter(Boolean);
    if (domains.length) extra.search_domain_filter = domains.slice(0, 10);
  }
  return extra;
}

async function callPerplexity(apiKey, { model, system, user, sampling, extra, responseFormat } = {}) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: user });

  const body = { model, messages, ...sampling, ...extra };
  if (responseFormat) body.response_format = responseFormat;

  const response = await axios.post(API_URL, body, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    timeout: 300000,
    maxContentLength: 25 * 1024 * 1024,
    maxBodyLength: 25 * 1024 * 1024,
  });

  const choice = response.data.choices?.[0];
  const text = choice?.message?.content || "";
  const citations = response.data.citations || response.data.search_results || [];
  return {
    text,
    citations,
    model: response.data.model || model,
    tokensUsed: response.data.usage?.total_tokens || 0,
    finishReason: choice?.finish_reason,
    raw: response.data,
  };
}

// ── Operation handlers ──────────────────────────────────────────────────────

async function opMessage(config, input, apiKey) {
  const { model = "sonar", prompt, outputFormat = "text" } = config;
  if (!prompt) return { success: false, error: "Perplexity message: 'prompt' is required.", skipped: true };

  const system = config.systemPrompt ||
    (outputFormat === "json"
      ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations."
      : "You are a helpful assistant. Respond clearly and concisely.");

  const { text, citations, model: usedModel, tokensUsed, finishReason } = await callPerplexity(apiKey, {
    model, system,
    user: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`,
    sampling: samplingBody(config, { temperature: 0.7, maxTokens: 2000 }),
    extra: searchFilters(config),
  });

  return {
    result: outputFormat === "json" ? maybeJson(text) : text,
    citations, model: usedModel, tokensUsed, finishReason, provider: "perplexity", operation: "message",
  };
}

async function opSearch(config, input, apiKey) {
  const { model = "sonar-pro", prompt } = config;
  const query = prompt || config.query || inputSummary(input);
  if (!query) return { success: false, error: "Perplexity search: a 'prompt' / query is required.", skipped: true };

  const { text, citations, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: config.systemPrompt || "You are a research assistant. Answer the question accurately using current web sources, and cite them.",
    user: query,
    sampling: samplingBody(config, { temperature: 0.2, maxTokens: 2000 }),
    extra: searchFilters(config),
  });

  return { answer: text, citations, sourceCount: citations.length, model: usedModel, tokensUsed, provider: "perplexity", operation: "search" };
}

async function opAskWithCitations(config, input, apiKey) {
  const r = await opSearch(config, input, apiKey);
  if (r.skipped) return r;
  return { ...r, operation: "askWithCitations" };
}

async function opStructuredOutput(config, input, apiKey) {
  const { model = "sonar-pro", prompt } = config;
  if (!prompt) return { success: false, error: "Perplexity structuredOutput: 'prompt' is required.", skipped: true };

  let responseFormat;
  if (config.jsonSchema) {
    let schema;
    try { schema = typeof config.jsonSchema === "string" ? JSON.parse(config.jsonSchema) : config.jsonSchema; }
    catch { throw new Error("Perplexity structuredOutput: 'jsonSchema' is not valid JSON."); }
    responseFormat = { type: "json_schema", json_schema: { schema } };
  } else {
    responseFormat = { type: "json_object" };
  }

  const { text, citations, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: config.systemPrompt || "You are a structured-data extraction engine. Output strictly valid JSON.",
    user: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`,
    sampling: samplingBody(config, { temperature: 0.1, maxTokens: 2000 }),
    extra: searchFilters(config),
    responseFormat,
  });

  return { result: maybeJson(text), citations, model: usedModel, tokensUsed, provider: "perplexity", operation: "structuredOutput" };
}

async function opReasoning(config, input, apiKey) {
  const { model = "sonar-reasoning-pro", prompt } = config;
  if (!prompt) return { success: false, error: "Perplexity reasoning: 'prompt' is required.", skipped: true };

  const { text, citations, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: config.systemPrompt || "Reason step by step using current information, then give a clear answer.",
    user: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`,
    sampling: samplingBody(config, { temperature: 0.3, maxTokens: 4000 }),
    extra: searchFilters(config),
  });

  // sonar-reasoning emits <think>…</think> — split it out.
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
  const thinking = thinkMatch ? thinkMatch[1].trim() : undefined;
  const result = text.replace(/<think>[\s\S]*?<\/think>/i, "").trim();

  return { result, thinking, citations, model: usedModel, tokensUsed, provider: "perplexity", operation: "reasoning" };
}

async function opDeepResearch(config, input, apiKey) {
  const { model = "sonar-deep-research", prompt } = config;
  const topic = prompt || config.topic || inputSummary(input);
  if (!topic) return { success: false, error: "Perplexity deepResearch: a 'prompt' / topic is required.", skipped: true };

  const extra = searchFilters(config);
  if (config.reasoningEffort) extra.reasoning_effort = config.reasoningEffort;

  const { text, citations, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: config.systemPrompt || "You are an expert research analyst. Produce a thorough, well-structured, source-dense report.",
    user: topic,
    sampling: samplingBody(config, { temperature: 0.2, maxTokens: 8000 }),
    extra,
  });

  return { report: text, citations, sourceCount: citations.length, model: usedModel, tokensUsed, provider: "perplexity", operation: "deepResearch" };
}

async function opFactCheck(config, input, apiKey) {
  const { model = "sonar-pro" } = config;
  const claim = config.prompt || config.claim || inputSummary(input);
  if (!claim) return { success: false, error: "Perplexity factCheck: a 'claim' is required.", skipped: true };

  const { text, citations, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: 'You are a meticulous fact-checker. Verify the claim against current sources. Respond with JSON {"verdict":"true|false|misleading|unverifiable","explanation":string}.',
    user: `Fact-check this claim:\n\n${claim}`,
    sampling: samplingBody(config, { temperature: 0, maxTokens: 1500 }),
    extra: searchFilters(config),
    responseFormat: { type: "json_object" },
  });

  return { result: maybeJson(text), citations, model: usedModel, tokensUsed, provider: "perplexity", operation: "factCheck" };
}

async function opCompare(config, input, apiKey) {
  const { model = "sonar-pro" } = config;
  const subject = config.prompt || config.items || inputSummary(input);
  if (!subject) return { success: false, error: "Perplexity compare: items to compare are required.", skipped: true };

  const { text, citations, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: config.systemPrompt || "You are a comparison analyst. Compare the items across relevant dimensions using current sources, and cite them.",
    user: `Compare the following, with a clear recommendation:\n\n${subject}`,
    sampling: samplingBody(config, { temperature: 0.3, maxTokens: 3000 }),
    extra: searchFilters(config),
  });

  return { comparison: text, citations, model: usedModel, tokensUsed, provider: "perplexity", operation: "compare" };
}

async function opNewsDigest(config, input, apiKey) {
  const { model = "sonar" } = config;
  const topic = config.prompt || config.topic || inputSummary(input);
  if (!topic) return { success: false, error: "Perplexity newsDigest: a 'topic' is required.", skipped: true };

  const extra = searchFilters(config);
  if (!extra.search_recency_filter) extra.search_recency_filter = "week";

  const { text, citations, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: "You are a news editor. Summarize the latest developments on the topic as a concise digest with sources.",
    user: `Give me the latest news on: ${topic}`,
    sampling: samplingBody(config, { temperature: 0.2, maxTokens: 2500 }),
    extra,
  });

  return { digest: text, citations, model: usedModel, tokensUsed, provider: "perplexity", operation: "newsDigest" };
}

async function opExtractData(config, input, apiKey) {
  const { model = "sonar-pro" } = config;
  const source = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Perplexity extractData: provide text to extract from.", skipped: true };

  const fields = config.fields || "all relevant structured fields";
  const { text, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: "You extract structured data from text. Output strictly valid JSON with the requested fields.",
    user: `Extract ${fields} from the following text as JSON:\n\n${String(source).substring(0, 30000)}`,
    sampling: samplingBody(config, { temperature: 0, maxTokens: 2000 }),
    responseFormat: { type: "json_object" },
  });

  return { result: maybeJson(text), model: usedModel, tokensUsed, provider: "perplexity", operation: "extractData" };
}

async function opClassify(config, input, apiKey) {
  const { model = "sonar" } = config;
  const source = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Perplexity classify: provide text to classify.", skipped: true };

  const categories = (config.categories || "").toString().split(/[\n,]/).map(c => c.trim()).filter(Boolean);
  const catLine = categories.length ? `Categories: ${categories.join(", ")}.` : "Choose the single most appropriate category.";

  const { text, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: `You are a text classifier. ${catLine} Respond with JSON {"category": string, "confidence": number}.`,
    user: `Classify this text:\n\n${String(source).substring(0, 15000)}`,
    sampling: samplingBody(config, { temperature: 0, maxTokens: 500 }),
    responseFormat: { type: "json_object" },
  });

  return { result: maybeJson(text), model: usedModel, tokensUsed, provider: "perplexity", operation: "classify" };
}

async function opSummarize(config, input, apiKey) {
  const { model = "sonar" } = config;
  const source = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Perplexity summarize: provide text to summarize.", skipped: true };

  const styleMap = {
    bullets: "as a concise bulleted list",
    paragraph: "as a short paragraph",
    tweet: "in a single tweet-length sentence",
    eli5: "in simple terms a 5-year-old could understand",
  };
  const style = styleMap[config.summaryStyle] || "concisely";

  const { text, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: "You are a summarization assistant. Capture the key points faithfully.",
    user: `Summarize the following text ${style}:\n\n${String(source).substring(0, 50000)}`,
    sampling: samplingBody(config, { temperature: 0.3, maxTokens: 1500 }),
  });

  return { summary: text, model: usedModel, tokensUsed, provider: "perplexity", operation: "summarize" };
}

async function opTranslate(config, input, apiKey) {
  const { model = "sonar" } = config;
  const source = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Perplexity translate: provide text to translate.", skipped: true };

  const targetLang = config.targetLanguage || "English";
  const { text, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: `You are a professional translator. Translate the text into ${targetLang}. Output only the translation, no notes.`,
    user: String(source).substring(0, 30000),
    sampling: samplingBody(config, { temperature: 0.2, maxTokens: 3000 }),
  });

  return { translation: text, targetLanguage: targetLang, model: usedModel, tokensUsed, provider: "perplexity", operation: "translate" };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const { model = "sonar-pro", prompt = "Summarize this document.", outputFormat = "text" } = config;
  const documentText = config.documentText || input?.text || input?.content || input?.body || inputSummary(input);
  if (!documentText) throw new Error("Perplexity analyzeDocument: provide 'documentText' or pass text as input.");

  const { text, citations, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: outputFormat === "json"
      ? "You are a document analysis assistant. Respond with valid JSON only."
      : "You are a document analysis assistant. Analyze the provided document thoroughly.",
    user: `${prompt}\n\n---\nDocument:\n${String(documentText).substring(0, 50000)}`,
    sampling: samplingBody(config, { temperature: 0.3, maxTokens: 4000 }),
    responseFormat: outputFormat === "json" ? { type: "json_object" } : undefined,
  });

  return { result: outputFormat === "json" ? maybeJson(text) : text, citations, model: usedModel, tokensUsed, provider: "perplexity", operation: "analyzeDocument" };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = "sonar" } = config;
  const taskDescription = config.task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "Perplexity generatePrompt: 'task' description is required.", skipped: true };

  const { text, model: usedModel, tokensUsed } = await callPerplexity(apiKey, {
    model,
    system: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text.",
    user: `Write an effective AI prompt for this task: ${taskDescription}`,
    sampling: samplingBody(config, { temperature: 0.8, maxTokens: 1200 }),
  });

  return { prompt: text, model: usedModel, tokensUsed, provider: "perplexity", operation: "generatePrompt" };
}

// ── Live model list ─────────────────────────────────────────────────────────
// Perplexity has no public /models endpoint — return the current Sonar family.

const KNOWN_MODELS = [
  "sonar",
  "sonar-pro",
  "sonar-reasoning",
  "sonar-reasoning-pro",
  "sonar-deep-research",
];

export async function listModels(credentialId, workspaceId) {
  // Validate the credential resolves, then return the known Sonar family.
  await getApiKey(credentialId, workspaceId);
  return [...KNOWN_MODELS];
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  search: opSearch,
  askWithCitations: opAskWithCitations,
  structuredOutput: opStructuredOutput,
  reasoning: opReasoning,
  deepResearch: opDeepResearch,
  factCheck: opFactCheck,
  compare: opCompare,
  newsDigest: opNewsDigest,
  extractData: opExtractData,
  classify: opClassify,
  summarize: opSummarize,
  translate: opTranslate,
  analyzeDocument: opAnalyzeDocument,
  generatePrompt: opGeneratePrompt,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "message";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Perplexity: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId) return { success: false, error: "Perplexity: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Perplexity: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};
