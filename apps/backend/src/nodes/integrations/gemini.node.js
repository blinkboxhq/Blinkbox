/**
 * GEMINI NODE
 *
 * Multi-operation Google Gemini node via the Generative Language API.
 *
 * One subject node exposing 15 distinct operations, dispatched by
 * `config.operation` (default: "message").
 *
 * Credential: getOAuthToken(credentialId, workspaceId, "Gemini") → API key.
 *
 * OPERATIONS:
 *   message          — Chat with Gemini (text or JSON)
 *   structuredOutput — Force a strict JSON schema on the response
 *   functionCalling  — Let the model pick & fill tools you define
 *   reasoning        — Thinking-budget deep reasoning
 *   analyzeImage     — Vision: describe / answer about an image
 *   generateImage    — Native image generation (image out)
 *   analyzeDocument  — Ask questions about a long document / text
 *   analyzePdf       — Analyze a PDF (file in)
 *   analyzeAudio     — Understand / transcribe audio (file in)
 *   analyzeVideo     — Understand a video (file in)
 *   embeddings       — Turn text into vectors for search & RAG
 *   extractData      — Pull structured fields out of messy text
 *   classify         — Label text into one of N categories
 *   summarize        — Summarize long text
 *   translate        — Translate text between languages
 *   generatePrompt   — Write an effective prompt for a task
 *
 * Output varies by operation.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODELS_URL = `${GEMINI_BASE}/models`;

async function getApiKey(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Gemini");
}

function handleError(err) {
  if (err.message?.startsWith("Gemini")) throw err;
  const msg = err.response?.data?.error?.message || err.message;
  if (err.response?.status === 400) throw new Error(`Gemini: Bad request — ${msg}`);
  if (err.response?.status === 401) throw new Error("Gemini: Invalid API key. Check your credential in the Vault.");
  if (err.response?.status === 403) throw new Error("Gemini: Invalid API key or access denied.");
  if (err.response?.status === 404) throw new Error(`Gemini: Resource not found — ${msg}`);
  if (err.response?.status === 422) throw new Error(`Gemini: Unprocessable request — ${msg}`);
  if (err.response?.status === 429) throw new Error("Gemini: Rate limit / quota exceeded. Retry later.");
  if (err.response?.status >= 500) throw new Error(`Gemini: Server error (${err.response.status}) — try again later.`);
  throw new Error(`Gemini failed: ${err.response?.status || err.code} — ${msg}`);
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

// Resolve a media ref (http/https URL — SSRF-guarded — or data: URI / raw
// base64) into a Gemini inlineData part.
async function resolveInlinePart(ref, { fallbackMime, label = "file", maxBytes = 20 * 1024 * 1024 } = {}) {
  if (!ref || typeof ref !== "string") throw new Error(`Gemini: ${label} is required.`);
  if (ref.startsWith("data:")) {
    const [meta, data] = ref.split(",");
    const mimeType = meta.replace("data:", "").replace(";base64", "") || fallbackMime;
    return { inlineData: { mimeType, data } };
  }
  if (/^https?:\/\//i.test(ref)) {
    await assertSafeUrlResolved(ref);
    const res = await axios.get(ref, { responseType: "arraybuffer", timeout: 60000, maxContentLength: maxBytes, maxRedirects: 0 });
    const mimeType = (res.headers["content-type"] || fallbackMime || "application/octet-stream").split(";")[0];
    return { inlineData: { mimeType, data: Buffer.from(res.data).toString("base64") } };
  }
  return { inlineData: { mimeType: fallbackMime || "application/octet-stream", data: ref } };
}

function generationConfig(config, defaults = {}) {
  const gen = {};
  const temperature = config.temperature ?? defaults.temperature;
  const maxTokens = config.maxTokens ?? defaults.maxTokens;
  if (temperature !== undefined && temperature !== "") gen.temperature = Number(temperature);
  if (maxTokens !== undefined && maxTokens !== "") gen.maxOutputTokens = Number(maxTokens);
  if (config.topP !== undefined && config.topP !== "") gen.topP = Number(config.topP);
  if (config.topK !== undefined && config.topK !== "") gen.topK = Number(config.topK);
  const stop = config.stop;
  if (stop) {
    const seqs = (Array.isArray(stop) ? stop : String(stop).split("\n")).map(s => s.trim()).filter(Boolean);
    if (seqs.length) gen.stopSequences = seqs.slice(0, 5);
  }
  return gen;
}

async function callGemini(apiKey, model, { systemInstruction, parts, gen, tools, toolConfig } = {}) {
  const body = { contents: [{ role: "user", parts }] };
  if (systemInstruction) body.system_instruction = { parts: [{ text: systemInstruction }] };
  if (gen && Object.keys(gen).length) body.generationConfig = gen;
  if (tools) body.tools = tools;
  if (toolConfig) body.toolConfig = toolConfig;

  const response = await axios.post(`${MODELS_URL}/${model}:generateContent`, body, {
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    timeout: 180000,
    maxContentLength: 25 * 1024 * 1024,
    maxBodyLength: 25 * 1024 * 1024,
  });

  const candidate = response.data.candidates?.[0];
  const allParts = candidate?.content?.parts || [];
  const text = allParts.filter(p => p.text).map(p => p.text).join("");
  const functionCalls = allParts.filter(p => p.functionCall).map(p => p.functionCall);
  const images = allParts
    .filter(p => p.inlineData?.data)
    .map(p => ({ mimeType: p.inlineData.mimeType, base64: p.inlineData.data, dataUri: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` }));
  const usage = response.data.usageMetadata || {};
  const tokensUsed = (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0);
  return { text, functionCalls, images, raw: response.data, finishReason: candidate?.finishReason, tokensUsed };
}

// ── Operation handlers ──────────────────────────────────────────────────────

async function opMessage(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt, outputFormat = "text" } = config;
  if (!prompt) return { success: false, error: "Gemini message: 'prompt' is required.", skipped: true };

  const system = config.systemPrompt ||
    (outputFormat === "json"
      ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations."
      : "You are a helpful assistant. Respond clearly and concisely.");

  const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`;
  const gen = generationConfig(config, { temperature: 0.7, maxTokens: 2000 });
  if (outputFormat === "json") gen.responseMimeType = "application/json";

  const { text, tokensUsed, finishReason } = await callGemini(apiKey, model, {
    systemInstruction: system, parts: [{ text: userMessage }], gen,
  });

  return {
    result: outputFormat === "json" ? maybeJson(text) : text,
    model, tokensUsed, finishReason, provider: "gemini", operation: "message",
  };
}

async function opStructuredOutput(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt } = config;
  if (!prompt) return { success: false, error: "Gemini structuredOutput: 'prompt' is required.", skipped: true };

  let schema;
  if (config.jsonSchema) {
    try { schema = typeof config.jsonSchema === "string" ? JSON.parse(config.jsonSchema) : config.jsonSchema; }
    catch { throw new Error("Gemini structuredOutput: 'jsonSchema' is not valid JSON."); }
  }

  const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`;
  const gen = generationConfig(config, { temperature: 0.2, maxTokens: 2000 });
  gen.responseMimeType = "application/json";
  if (schema) gen.responseSchema = schema;

  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: config.systemPrompt || "You are a structured-data extraction engine. Output strictly valid JSON.",
    parts: [{ text: userMessage }], gen,
  });

  return { result: maybeJson(text), model, tokensUsed, provider: "gemini", operation: "structuredOutput" };
}

async function opFunctionCalling(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt } = config;
  if (!prompt) return { success: false, error: "Gemini functionCalling: 'prompt' is required.", skipped: true };

  let declarations;
  try {
    const raw = typeof config.tools === "string" ? JSON.parse(config.tools) : config.tools;
    declarations = Array.isArray(raw) ? raw : raw?.functionDeclarations || raw?.function_declarations;
  } catch { throw new Error("Gemini functionCalling: 'tools' must be a JSON array of function declarations."); }
  if (!Array.isArray(declarations) || !declarations.length) {
    return { success: false, error: "Gemini functionCalling: provide a 'tools' JSON array.", skipped: true };
  }

  const modeMap = { auto: "AUTO", required: "ANY", none: "NONE" };
  const mode = modeMap[config.toolChoice] || "AUTO";

  const { text, functionCalls, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: config.systemPrompt || "You can call the provided tools when helpful.",
    parts: [{ text: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` }],
    gen: generationConfig(config, { temperature: 0.3, maxTokens: 2000 }),
    tools: [{ functionDeclarations: declarations }],
    toolConfig: { functionCallingConfig: { mode } },
  });

  return {
    toolCalls: functionCalls.map(fc => ({ name: fc.name, arguments: fc.args })),
    text, calledTools: functionCalls.length > 0, model, tokensUsed,
    provider: "gemini", operation: "functionCalling",
  };
}

async function opReasoning(config, input, apiKey) {
  const { model = "gemini-3.1-pro-preview", prompt } = config;
  if (!prompt) return { success: false, error: "Gemini reasoning: 'prompt' is required.", skipped: true };

  const gen = generationConfig(config, { temperature: 0.4, maxTokens: 8000 });
  const budgetMap = { low: 1024, medium: 8192, high: 24576 };
  const budget = budgetMap[config.reasoningEffort] ?? budgetMap.medium;
  gen.thinkingConfig = { thinkingBudget: budget, includeThoughts: true };

  const { text, raw, tokensUsed, finishReason } = await callGemini(apiKey, model, {
    systemInstruction: config.systemPrompt || "Think step by step and reason carefully before answering.",
    parts: [{ text: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` }], gen,
  });

  const thoughts = (raw.candidates?.[0]?.content?.parts || []).filter(p => p.thought && p.text).map(p => p.text).join("\n");
  return { result: text, thinking: thoughts || undefined, model, tokensUsed, finishReason, provider: "gemini", operation: "reasoning" };
}

async function opAnalyzeImage(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt = "Describe this image in detail." } = config;
  const imageUrl = config.imageUrl || input?.imageUrl || input?.url;
  if (!imageUrl) return { success: false, error: "Gemini analyzeImage: 'imageUrl' is required.", skipped: true };

  const part = await resolveInlinePart(imageUrl, { fallbackMime: "image/jpeg", label: "image" });
  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You are a helpful vision assistant. Analyze images thoroughly and answer accurately.",
    parts: [part, { text: prompt }],
    gen: generationConfig(config, { temperature: 0.5, maxTokens: 1500 }),
  });

  return { result: text, model, tokensUsed, provider: "gemini", operation: "analyzeImage" };
}

async function opGenerateImage(config, input, apiKey) {
  const { model = "gemini-3.1-flash-image" } = config;
  const imagePrompt = config.imagePrompt || config.prompt || input?.prompt;
  if (!imagePrompt) return { success: false, error: "Gemini generateImage: 'imagePrompt' is required.", skipped: true };

  const parts = [{ text: imagePrompt }];
  if (config.fileInput) parts.unshift(await resolveInlinePart(config.fileInput, { fallbackMime: "image/png", label: "source image" }));

  const { images, text, tokensUsed } = await callGemini(apiKey, model, { parts });
  if (!images.length) return { success: false, error: `Gemini generateImage: model returned no image${text ? ` — ${text}` : ""}.`, skipped: true };

  return {
    images, image: images[0], dataUri: images[0].dataUri, count: images.length,
    text: text || undefined, model, tokensUsed, provider: "gemini", operation: "generateImage",
  };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt = "Summarize this document.", outputFormat = "text" } = config;
  const documentText = config.documentText || input?.text || input?.content || input?.body || inputSummary(input);
  if (!documentText) throw new Error("Gemini analyzeDocument: provide 'documentText' or pass text as input.");

  const gen = generationConfig(config, { temperature: 0.3, maxTokens: 4000 });
  if (outputFormat === "json") gen.responseMimeType = "application/json";

  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: outputFormat === "json"
      ? "You are a document analysis assistant. Respond with valid JSON only."
      : "You are a document analysis assistant. Analyze the provided document thoroughly.",
    parts: [{ text: `${prompt}\n\n---\nDocument:\n${String(documentText).substring(0, 60000)}` }], gen,
  });

  return { result: outputFormat === "json" ? maybeJson(text) : text, model, tokensUsed, provider: "gemini", operation: "analyzeDocument" };
}

async function opAnalyzePdf(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt = "Summarize this PDF." } = config;
  const fileRef = config.fileInput || input?.fileUrl || input?.url;
  if (!fileRef) return { success: false, error: "Gemini analyzePdf: a PDF 'fileInput' is required.", skipped: true };

  const part = await resolveInlinePart(fileRef, { fallbackMime: "application/pdf", label: "PDF" });
  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You are a document analysis assistant. Read the PDF and answer accurately.",
    parts: [part, { text: prompt }],
    gen: generationConfig(config, { temperature: 0.3, maxTokens: 4000 }),
  });

  return { result: text, model, tokensUsed, provider: "gemini", operation: "analyzePdf" };
}

async function opAnalyzeAudio(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt = "Transcribe this audio." } = config;
  const fileRef = config.fileInput || config.audioUrl || input?.audioUrl || input?.url;
  if (!fileRef) return { success: false, error: "Gemini analyzeAudio: an audio 'fileInput' is required.", skipped: true };

  const part = await resolveInlinePart(fileRef, { fallbackMime: "audio/mp3", label: "audio" });
  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You are an audio understanding assistant. Transcribe and analyze audio accurately.",
    parts: [part, { text: prompt }],
    gen: generationConfig(config, { temperature: 0.2, maxTokens: 4000 }),
  });

  return { result: text, model, tokensUsed, provider: "gemini", operation: "analyzeAudio" };
}

async function opAnalyzeVideo(config, input, apiKey) {
  const { model = "gemini-3.5-flash", prompt = "Describe what happens in this video." } = config;
  const fileRef = config.fileInput || config.videoUrl || input?.videoUrl || input?.url;
  if (!fileRef) return { success: false, error: "Gemini analyzeVideo: a video 'fileInput' is required.", skipped: true };

  const part = await resolveInlinePart(fileRef, { fallbackMime: "video/mp4", label: "video", maxBytes: 25 * 1024 * 1024 });
  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You are a video understanding assistant. Describe and analyze video content accurately.",
    parts: [part, { text: prompt }],
    gen: generationConfig(config, { temperature: 0.4, maxTokens: 4000 }),
  });

  return { result: text, model, tokensUsed, provider: "gemini", operation: "analyzeVideo" };
}

async function opEmbeddings(config, input, apiKey) {
  const { model = "gemini-embedding-001" } = config;
  const raw = config.text || input?.text || input?.content || (typeof input === "string" ? input : "");
  if (!raw) return { success: false, error: "Gemini embeddings: 'text' is required.", skipped: true };

  const texts = Array.isArray(raw) ? raw : [raw];
  const requests = texts.map(t => ({
    model: `models/${model}`,
    content: { parts: [{ text: String(t) }] },
    ...(config.dimensions ? { outputDimensionality: Number(config.dimensions) } : {}),
  }));

  const response = await axios.post(
    `${MODELS_URL}/${model}:batchEmbedContents`,
    { requests },
    { headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, timeout: 60000 },
  );

  const vectors = (response.data.embeddings || []).map(e => e.values);
  return {
    embeddings: Array.isArray(raw) ? vectors : vectors[0],
    dimensions: vectors[0]?.length || 0,
    count: vectors.length, model, provider: "gemini", operation: "embeddings",
  };
}

async function opExtractData(config, input, apiKey) {
  const { model = "gemini-3.5-flash" } = config;
  const source = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Gemini extractData: provide text to extract from.", skipped: true };

  const fields = config.fields || "all relevant structured fields";
  const gen = generationConfig(config, { temperature: 0.1, maxTokens: 2000 });
  gen.responseMimeType = "application/json";

  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You extract structured data from text. Output strictly valid JSON with the requested fields.",
    parts: [{ text: `Extract ${fields} from the following text as JSON:\n\n${String(source).substring(0, 30000)}` }], gen,
  });

  return { result: maybeJson(text), model, tokensUsed, provider: "gemini", operation: "extractData" };
}

async function opClassify(config, input, apiKey) {
  const { model = "gemini-3.5-flash" } = config;
  const source = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Gemini classify: provide text to classify.", skipped: true };

  const categories = (config.categories || "")
    .toString().split(/[\n,]/).map(c => c.trim()).filter(Boolean);
  const catLine = categories.length ? `Categories: ${categories.join(", ")}.` : "Choose the single most appropriate category.";

  const gen = generationConfig(config, { temperature: 0, maxTokens: 500 });
  gen.responseMimeType = "application/json";

  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: `You are a text classifier. ${catLine} Respond with JSON {"category": string, "confidence": number}.`,
    parts: [{ text: `Classify this text:\n\n${String(source).substring(0, 15000)}` }], gen,
  });

  return { result: maybeJson(text), model, tokensUsed, provider: "gemini", operation: "classify" };
}

async function opSummarize(config, input, apiKey) {
  const { model = "gemini-3.5-flash" } = config;
  const source = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Gemini summarize: provide text to summarize.", skipped: true };

  const styleMap = {
    bullets: "as a concise bulleted list",
    paragraph: "as a short paragraph",
    tweet: "in a single tweet-length sentence",
    eli5: "in simple terms a 5-year-old could understand",
  };
  const style = styleMap[config.summaryStyle] || "concisely";

  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You are a summarization assistant. Capture the key points faithfully.",
    parts: [{ text: `Summarize the following text ${style}:\n\n${String(source).substring(0, 60000)}` }],
    gen: generationConfig(config, { temperature: 0.3, maxTokens: 1500 }),
  });

  return { summary: text, model, tokensUsed, provider: "gemini", operation: "summarize" };
}

async function opTranslate(config, input, apiKey) {
  const { model = "gemini-3.5-flash" } = config;
  const source = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Gemini translate: provide text to translate.", skipped: true };

  const targetLang = config.targetLanguage || "English";
  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: `You are a professional translator. Translate the text into ${targetLang}. Output only the translation, no notes.`,
    parts: [{ text: String(source).substring(0, 30000) }],
    gen: generationConfig(config, { temperature: 0.2, maxTokens: 3000 }),
  });

  return { translation: text, targetLanguage: targetLang, model, tokensUsed, provider: "gemini", operation: "translate" };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = "gemini-3.5-flash" } = config;
  const taskDescription = config.task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "Gemini generatePrompt: 'task' description is required.", skipped: true };

  const { text, tokensUsed } = await callGemini(apiKey, model, {
    systemInstruction: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text.",
    parts: [{ text: `Write an effective AI prompt for this task: ${taskDescription}` }],
    gen: generationConfig(config, { temperature: 0.8, maxTokens: 1200 }),
  });

  return { prompt: text, tokensUsed, model, provider: "gemini", operation: "generatePrompt" };
}

// ── Live model list ─────────────────────────────────────────────────────────

export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  const response = await axios.get(MODELS_URL, {
    headers: { "x-goog-api-key": apiKey }, timeout: 30000, params: { pageSize: 200 },
  });
  return (response.data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).some(x => x === "generateContent" || x === "embedContent"))
    .map(m => (m.name || "").replace(/^models\//, ""))
    .filter(Boolean)
    .sort();
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  structuredOutput: opStructuredOutput,
  functionCalling: opFunctionCalling,
  reasoning: opReasoning,
  analyzeImage: opAnalyzeImage,
  generateImage: opGenerateImage,
  analyzeDocument: opAnalyzeDocument,
  analyzePdf: opAnalyzePdf,
  analyzeAudio: opAnalyzeAudio,
  analyzeVideo: opAnalyzeVideo,
  embeddings: opEmbeddings,
  extractData: opExtractData,
  classify: opClassify,
  summarize: opSummarize,
  translate: opTranslate,
  generatePrompt: opGeneratePrompt,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "message";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Gemini: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId) return { success: false, error: "Gemini: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Gemini: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      handleError(err);
    }
  },
};
