/**
 * OPENAI NODE
 *
 * Multi-operation OpenAI node.
 *
 * Config:
 *   operation    — see OPERATIONS below (default: "message")
 *   model        — model id (default per operation)
 *   prompt       — instruction / user message (most operations)
 *   credentialId — Vault reference to OpenAI API key
 *   outputFormat — "json" | "text" (default: "text") — message op only
 *   temperature  — 0-2 (default: 0.7)
 *   maxTokens    — max response tokens (default: 2000)
 *
 *   ── analyzeImage ──
 *   imageUrl     — public URL or base64 data URI of the image
 *
 *   ── generateImage ──
 *   imagePrompt  — text description of the image to generate
 *   imageSize    — "1024x1024" | "1792x1024" | "1024x1792" (default: "1024x1024")
 *   imageQuality — "standard" | "hd" (default: "standard")
 *
 *   ── transcribeAudio ──
 *   audioUrl     — publicly accessible URL to .mp3/.mp4/.m4a/.wav/.webm
 *   language     — ISO-639-1 language code (optional, e.g. "en")
 *
 *   ── moderateContent ──
 *   (uses prompt as the text to moderate)
 *
 * OPERATIONS:
 *   message          — Chat completion (GPT-4o, GPT-4o-mini, etc.)
 *   analyzeImage     — Vision: describe or answer questions about an image
 *   generateImage    — DALL-E 3: generate an image from text
 *   transcribeAudio  — Whisper: transcribe audio to text
 *   analyzeDocument  — Send document text as context + ask a question
 *   moderateContent  — Run text through the Moderation API
 *   generatePrompt   — Ask GPT to write a prompt for a given task
 *   improvePrompt    — Ask GPT to improve/rewrite an existing prompt
 *
 * Output varies by operation — see each handler below.
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

const BASE = "https://api.openai.com/v1";

async function getApiKey(credentialId, workspaceId) {
  const __accessToken = await getOAuthToken(credentialId, workspaceId, "OpenAI");
  return __accessToken;
}

function handleError(err, provider = "OpenAI") {
  if (err.message?.startsWith("OpenAI")) throw err;
  if (err.response?.status === 401) throw new Error(`${provider}: Invalid API key.`);
  if (err.response?.status === 403) throw new Error(`${provider}: Access forbidden — check your API key permissions.`);
  if (err.response?.status === 404) throw new Error(`${provider}: Resource not found — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 422) throw new Error(`${provider}: Unprocessable request — ${err.response?.data?.error?.message || err.message}`);
  if (err.response?.status === 429) throw new Error(`${provider}: Quota exceeded — check your billing at platform.openai.com`);
  if (err.response?.status >= 500) throw new Error(`${provider}: Server error (${err.response.status}) — try again later.`);
  if (err.response?.status === 400) throw new Error(`${provider}: Bad request — ${err.response?.data?.error?.message || err.message}`);
  throw new Error(`${provider} failed: ${err.response?.status || err.code} — ${err.response?.data?.error?.message || err.message}`);
}

function inputSummary(input) {
  return typeof input === "string"
    ? input
    : JSON.stringify(input, null, 2).substring(0, 15000);
}

// Resolve a file reference (http/https URL — SSRF-guarded — or data URI / raw
// base64) into a Buffer the OpenAI multipart/JSON endpoints can consume.
async function resolveFileToBuffer(ref, { maxBytes = 25 * 1024 * 1024, label = "file" } = {}) {
  if (!ref || typeof ref !== "string") throw new Error(`OpenAI: ${label} is required.`);
  if (ref.startsWith("data:")) {
    const b64 = ref.replace(/^data:[^;]+;base64,/, "");
    return Buffer.from(b64, "base64");
  }
  if (/^https?:\/\//i.test(ref)) {
    await assertSafeUrlResolved(ref);
    const res = await axios.get(ref, { responseType: "arraybuffer", timeout: 60000, maxContentLength: maxBytes, maxRedirects: 0 });
    return Buffer.from(res.data);
  }
  // assume raw base64
  return Buffer.from(ref, "base64");
}

// A file ref usable inline in chat content (image_url / input_file). Passes
// through data URIs and SSRF-checks http(s) URLs without downloading.
async function resolveInlineRef(ref, label = "file") {
  if (!ref || typeof ref !== "string") throw new Error(`OpenAI: ${label} is required.`);
  if (ref.startsWith("data:")) return ref;
  if (/^https?:\/\//i.test(ref)) { await assertSafeUrlResolved(ref); return ref; }
  throw new Error(`OpenAI: ${label} must be an http/https URL or base64 data URI.`);
}

// Build the common sampling/advanced params from config, omitting unset ones so
// the provider applies its own defaults.
function samplingParams(config) {
  const p = {};
  if (config.temperature !== undefined && config.temperature !== "") p.temperature = Number(config.temperature);
  if (config.maxTokens) p.max_tokens = Number(config.maxTokens);
  if (config.topP !== undefined && config.topP !== "") p.top_p = Number(config.topP);
  if (config.frequencyPenalty !== undefined && config.frequencyPenalty !== "") p.frequency_penalty = Number(config.frequencyPenalty);
  if (config.presencePenalty !== undefined && config.presencePenalty !== "") p.presence_penalty = Number(config.presencePenalty);
  if (config.seed !== undefined && config.seed !== "") p.seed = Number(config.seed);
  if (config.stop) p.stop = String(config.stop).split("\n").map(s => s.trim()).filter(Boolean).slice(0, 4);
  if (config.user) p.user = String(config.user);
  return p;
}

const DEFAULT_CHAT_MODEL = "gpt-5.4";

// ── Operation handlers ──────────────────────────────────────────────────────

async function opMessage(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt, outputFormat = "text" } = config;
  if (!prompt) return { success: false, error: "OpenAI message: 'prompt' is required.", skipped: true };

  const systemMessage =
    config.systemPrompt ||
    (outputFormat === "json"
      ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
      : "You are a helpful assistant. Respond clearly and concisely.");

  const userMessage = `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}`;

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      ...samplingParams({ temperature: config.temperature ?? 0.7, maxTokens: config.maxTokens ?? 2000, ...config }),
      ...(outputFormat === "json" && { response_format: { type: "json_object" } }),
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );

  const choice = response.data.choices?.[0];
  let result = choice?.message?.content || "";

  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return { result, model: response.data.model, tokensUsed: response.data.usage?.total_tokens || 0, finishReason: choice?.finish_reason, provider: "openai", operation: "message" };
}

async function opAnalyzeImage(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt = "Describe this image in detail.", detail = "auto" } = config;
  const ref = config.imageUrl || config.fileInput || input?.imageUrl || input?.url || input?.dataUri;
  const url = await resolveInlineRef(ref, "imageUrl");

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url, detail } },
        ],
      }],
      ...samplingParams({ maxTokens: config.maxTokens ?? 1000, ...config }),
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );

  const result = response.data.choices?.[0]?.message?.content || "";
  return { result, model: response.data.model, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "analyzeImage" };
}

async function opGenerateImage(config, input, apiKey) {
  const {
    model = "gpt-image-2",
    imagePrompt,
    prompt,
    imageSize = "1024x1024",
    imageQuality = "high",
    n = 1,
  } = config;

  const description = imagePrompt || prompt || input?.prompt || input?.description;
  if (!description) return { success: false, error: "OpenAI generateImage: 'imagePrompt' is required.", skipped: true };

  const body = { model, prompt: description, n: Math.min(Math.max(parseInt(n) || 1, 1), 10), size: imageSize };
  // gpt-image-* returns b64 by default and accepts quality high/medium/low;
  // dall-e-3 wants standard/hd + an explicit response_format.
  if (/^dall-e/.test(model)) {
    body.quality = imageQuality === "high" ? "hd" : "standard";
    body.response_format = "b64_json";
  } else {
    body.quality = ["high", "medium", "low"].includes(imageQuality) ? imageQuality : "high";
    if (config.background) body.background = config.background;
  }

  const response = await axios.post(`${BASE}/images/generations`, body, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    timeout: 180000,
  });

  const first = response.data.data?.[0];
  const b64 = first?.b64_json;
  const files = (response.data.data || []).map((d, i) => ({
    filename: `openai-image-${Date.now()}-${i}.png`,
    contentType: "image/png",
    base64: d.b64_json,
    dataUri: d.b64_json ? `data:image/png;base64,${d.b64_json}` : undefined,
    url: d.url,
    revisedPrompt: d.revised_prompt,
  }));

  return {
    filename: files[0]?.filename,
    contentType: "image/png",
    base64: b64,
    dataUri: b64 ? `data:image/png;base64,${b64}` : first?.url,
    imageUrl: first?.url,
    revisedPrompt: first?.revised_prompt,
    files,
    model,
    provider: "openai",
    operation: "generateImage",
  };
}

async function opEditImage(config, input, apiKey) {
  const { model = "gpt-image-2", imagePrompt, prompt, imageSize = "1024x1024" } = config;
  const description = imagePrompt || prompt;
  if (!description) return { success: false, error: "OpenAI editImage: 'imagePrompt' is required.", skipped: true };

  const sourceRef = config.fileInput || config.imageUrl || input?.dataUri || input?.imageUrl || input?.url || input?.base64;
  const imageBuffer = await resolveFileToBuffer(sourceRef, { label: "source image" });

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", description);
  form.append("size", imageSize);
  form.append("image", imageBuffer, { filename: "source.png", contentType: "image/png" });
  if (config.maskInput) {
    const maskBuffer = await resolveFileToBuffer(config.maskInput, { label: "mask" });
    form.append("mask", maskBuffer, { filename: "mask.png", contentType: "image/png" });
  }

  const response = await axios.post(`${BASE}/images/edits`, form, {
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    timeout: 180000,
  });

  const first = response.data.data?.[0];
  const b64 = first?.b64_json;
  return {
    filename: `openai-edit-${Date.now()}.png`,
    contentType: "image/png",
    base64: b64,
    dataUri: b64 ? `data:image/png;base64,${b64}` : first?.url,
    imageUrl: first?.url,
    model,
    provider: "openai",
    operation: "editImage",
  };
}

async function opTextToSpeech(config, input, apiKey) {
  const { model = "tts-1", voice = "alloy", format = "mp3", speed = 1 } = config;
  const text = config.text || config.prompt || input?.text || (typeof input === "string" ? input : "");
  if (!text) return { success: false, error: "OpenAI textToSpeech: 'text' is required.", skipped: true };

  const response = await axios.post(
    `${BASE}/audio/speech`,
    { model, input: String(text).substring(0, 4096), voice, response_format: format, speed: Number(speed) || 1 },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, responseType: "arraybuffer", timeout: 120000 },
  );

  const buf = Buffer.from(response.data);
  const mimeMap = { mp3: "audio/mpeg", opus: "audio/opus", aac: "audio/aac", flac: "audio/flac", wav: "audio/wav", pcm: "audio/pcm" };
  const contentType = mimeMap[format] || "audio/mpeg";
  const base64 = buf.toString("base64");
  return {
    filename: `openai-tts-${Date.now()}.${format}`,
    contentType,
    base64,
    dataUri: `data:${contentType};base64,${base64}`,
    sizeBytes: buf.length,
    model,
    provider: "openai",
    operation: "textToSpeech",
  };
}

async function opTranscribeAudio(config, input, apiKey) {
  const { model = "whisper-1", language } = config;
  const ref = config.fileInput || config.audioUrl || input?.audioUrl || input?.url || input?.dataUri || input?.base64;
  const audioBuffer = await resolveFileToBuffer(ref, { label: "audioUrl" });

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("file", audioBuffer, { filename: "audio.mp3", contentType: "audio/mpeg" });
  form.append("model", model);
  if (language) form.append("language", language);
  if (config.prompt) form.append("prompt", config.prompt);
  const wantTimestamps = config.timestamps === true || config.timestamps === "true";
  form.append("response_format", wantTimestamps ? "verbose_json" : "json");
  if (wantTimestamps) form.append("timestamp_granularities[]", "segment");

  const response = await axios.post(`${BASE}/audio/transcriptions`, form, {
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    timeout: 180000,
  });

  return {
    transcript: response.data.text || "",
    language: response.data.language || language || "auto",
    duration: response.data.duration,
    segments: response.data.segments,
    model,
    provider: "openai",
    operation: "transcribeAudio",
  };
}

async function opTranslateAudio(config, input, apiKey) {
  const ref = config.fileInput || config.audioUrl || input?.audioUrl || input?.url || input?.dataUri || input?.base64;
  const audioBuffer = await resolveFileToBuffer(ref, { label: "audioUrl" });

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("file", audioBuffer, { filename: "audio.mp3", contentType: "audio/mpeg" });
  form.append("model", "whisper-1");
  if (config.prompt) form.append("prompt", config.prompt);
  form.append("response_format", "json");

  const response = await axios.post(`${BASE}/audio/translations`, form, {
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    timeout: 180000,
  });

  return { translation: response.data.text || "", model: "whisper-1", provider: "openai", operation: "translateAudio" };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const { model = "gpt-4o-mini", prompt = "Summarize this document.", maxTokens = 4000 } = config;

  const documentText =
    config.documentText ||
    input?.text ||
    input?.content ||
    input?.body ||
    inputSummary(input);

  if (!documentText) throw new Error("OpenAI analyzeDocument: provide 'documentText' or pass document text as input.");

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: "You are a document analysis assistant. Analyze the provided document thoroughly and answer questions about it." },
        { role: "user", content: `${prompt}\n\n---\nDocument:\n${documentText.substring(0, 30000)}` },
      ],
      max_tokens: maxTokens,
      temperature: config.temperature ?? 0.3,
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );

  const result = response.data.choices?.[0]?.message?.content || "";
  return { result, model: response.data.model, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "analyzeDocument" };
}

async function opModerateContent(config, input, apiKey) {
  const text = config.prompt || config.text || input?.text || inputSummary(input);
  const imageRef = config.imageUrl || config.fileInput || input?.imageUrl;

  let payloadInput;
  if (imageRef) {
    const url = await resolveInlineRef(imageRef, "imageUrl");
    payloadInput = [
      ...(text ? [{ type: "text", text: String(text).substring(0, 10000) }] : []),
      { type: "image_url", image_url: { url } },
    ];
  } else {
    if (!text) return { success: false, error: "OpenAI moderateContent: text or image to moderate is required.", skipped: true };
    payloadInput = String(text).substring(0, 10000);
  }

  const response = await axios.post(
    `${BASE}/moderations`,
    { input: payloadInput, model: "omni-moderation-latest" },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30000 },
  );

  const result = response.data.results?.[0];
  return {
    flagged: result?.flagged || false,
    categories: result?.categories || {},
    scores: result?.category_scores || {},
    provider: "openai",
    operation: "moderateContent",
  };
}

async function opStructuredOutput(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "OpenAI structuredOutput: 'prompt' is required.", skipped: true };

  let schema;
  try {
    schema = typeof config.jsonSchema === "string" ? JSON.parse(config.jsonSchema) : config.jsonSchema;
  } catch {
    return { success: false, error: "OpenAI structuredOutput: jsonSchema is not valid JSON.", skipped: true };
  }
  if (!schema || typeof schema !== "object") {
    return { success: false, error: "OpenAI structuredOutput: a JSON schema is required.", skipped: true };
  }

  const response_format = {
    type: "json_schema",
    json_schema: { name: config.schemaName || "result", strict: config.strict !== false, schema },
  };

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        ...(config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : []),
        { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
      ],
      response_format,
      ...samplingParams(config),
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );

  const raw = response.data.choices?.[0]?.message?.content || "";
  let result = raw;
  try { result = JSON.parse(raw); } catch { /* leave raw */ }
  return { result, model: response.data.model, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "structuredOutput" };
}

async function opFunctionCalling(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "OpenAI functionCalling: 'prompt' is required.", skipped: true };

  let tools;
  try {
    tools = typeof config.tools === "string" ? JSON.parse(config.tools) : config.tools;
  } catch {
    return { success: false, error: "OpenAI functionCalling: tools definition is not valid JSON.", skipped: true };
  }
  if (!Array.isArray(tools) || tools.length === 0) {
    return { success: false, error: "OpenAI functionCalling: at least one tool/function is required.", skipped: true };
  }
  // Normalize bare function objects into the tools[] envelope.
  const normalized = tools.map(t => (t.type === "function" ? t : { type: "function", function: t }));

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        ...(config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : []),
        { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
      ],
      tools: normalized,
      ...(config.toolChoice ? { tool_choice: config.toolChoice } : {}),
      ...samplingParams(config),
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );

  const message = response.data.choices?.[0]?.message;
  const calls = (message?.tool_calls || []).map(c => ({
    id: c.id,
    name: c.function?.name,
    arguments: (() => { try { return JSON.parse(c.function?.arguments || "{}"); } catch { return c.function?.arguments; } })(),
  }));

  return {
    toolCalls: calls,
    content: message?.content || "",
    finishReason: response.data.choices?.[0]?.finish_reason,
    model: response.data.model,
    tokensUsed: response.data.usage?.total_tokens || 0,
    provider: "openai",
    operation: "functionCalling",
  };
}

async function opReasoning(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt, reasoningEffort = "medium" } = config;
  if (!prompt) return { success: false, error: "OpenAI reasoning: 'prompt' is required.", skipped: true };

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        ...(config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : []),
        { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
      ],
      reasoning_effort: reasoningEffort,
      ...(config.maxTokens ? { max_completion_tokens: Number(config.maxTokens) } : {}),
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 300000 },
  );

  const choice = response.data.choices?.[0];
  return {
    result: choice?.message?.content || "",
    reasoningEffort,
    model: response.data.model,
    tokensUsed: response.data.usage?.total_tokens || 0,
    reasoningTokens: response.data.usage?.completion_tokens_details?.reasoning_tokens,
    provider: "openai",
    operation: "reasoning",
  };
}

async function opEmbeddings(config, input, apiKey) {
  const { model = "text-embedding-3-large" } = config;
  let source = config.text || config.input || input?.text || input;
  if (Array.isArray(source)) { /* keep */ }
  else if (typeof source === "string") { /* keep */ }
  else source = inputSummary(input);
  if (!source || (Array.isArray(source) && source.length === 0)) {
    return { success: false, error: "OpenAI embeddings: 'text' input is required.", skipped: true };
  }

  const body = { model, input: source, encoding_format: "float" };
  if (config.dimensions) body.dimensions = Number(config.dimensions);

  const response = await axios.post(`${BASE}/embeddings`, body, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 60000,
  });

  const data = response.data.data || [];
  return {
    embedding: data[0]?.embedding,
    embeddings: data.map(d => d.embedding),
    count: data.length,
    dimensions: data[0]?.embedding?.length,
    model: response.data.model,
    tokensUsed: response.data.usage?.total_tokens || 0,
    provider: "openai",
    operation: "embeddings",
  };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = "gpt-4o-mini", task } = config;
  const taskDescription = task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "OpenAI generatePrompt: 'task' description is required.", skipped: true };

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations." },
        { role: "user", content: `Write an effective AI prompt for this task: ${taskDescription}` },
      ],
      max_tokens: 1000,
      temperature: 0.8,
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 60000 },
  );

  const result = response.data.choices?.[0]?.message?.content || "";
  return { prompt: result, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "generatePrompt" };
}

async function opImprovePrompt(config, input, apiKey) {
  const { model = "gpt-4o-mini" } = config;
  const originalPrompt = config.prompt || input?.prompt || input?.text || inputSummary(input);
  if (!originalPrompt) return { success: false, error: "OpenAI improvePrompt: 'prompt' to improve is required.", skipped: true };

  const response = await axios.post(
    `${BASE}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: "You are an expert prompt engineer. Rewrite and improve the given prompt to be clearer, more specific, and more effective. Return only the improved prompt, no explanations." },
        { role: "user", content: `Improve this prompt:\n\n${originalPrompt}` },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 60000 },
  );

  const result = response.data.choices?.[0]?.message?.content || "";
  return { improvedPrompt: result, originalPrompt, tokensUsed: response.data.usage?.total_tokens || 0, provider: "openai", operation: "improvePrompt" };
}

async function opImageVariation(config, input, apiKey) {
  const sourceRef = config.fileInput || config.imageUrl || input?.dataUri || input?.imageUrl || input?.url || input?.base64;
  const imageBuffer = await resolveFileToBuffer(sourceRef, { label: "source image" });
  const n = Math.min(Math.max(parseInt(config.n, 10) || 1, 1), 10);
  const size = config.imageSize || "1024x1024";

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("image", imageBuffer, { filename: "source.png", contentType: "image/png" });
  form.append("n", String(n));
  form.append("size", size);

  const response = await axios.post(`${BASE}/images/variations`, form, {
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    timeout: 180000,
  });

  const images = (response.data.data || []).map((d, i) => ({
    filename: `openai-variation-${Date.now()}-${i}.png`,
    contentType: "image/png",
    base64: d.b64_json,
    dataUri: d.b64_json ? `data:image/png;base64,${d.b64_json}` : d.url,
    imageUrl: d.url,
  }));
  return { images, count: images.length, ...images[0], provider: "openai", operation: "imageVariation" };
}

async function opListModels(config, input, apiKey) {
  const response = await axios.get(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000,
  });
  let ids = (response.data.data || []).map((m) => m.id).filter(Boolean);
  const filter = config.filter || "all";
  if (filter === "gpt") ids = ids.filter((id) => id.startsWith("gpt") || id.startsWith("o1") || id.startsWith("o3"));
  else if (filter === "embedding") ids = ids.filter((id) => id.includes("embedding"));
  else if (filter === "image") ids = ids.filter((id) => id.includes("image") || id.startsWith("dall-e"));
  ids.sort();
  return { models: ids, count: ids.length, provider: "openai", operation: "listModels" };
}

async function opFineTune(config, input, apiKey) {
  const trainingFile = config.trainingFile || input?.trainingFile;
  if (!trainingFile) return { success: false, error: "OpenAI fineTune: 'trainingFile' (uploaded file ID) is required.", skipped: true };
  const body = { model: config.model || "gpt-4o-mini-2024-07-18", training_file: trainingFile };
  if (config.validationFile) body.validation_file = config.validationFile;
  if (config.suffix) body.suffix = config.suffix;

  const response = await axios.post(`${BASE}/fine_tuning/jobs`, body, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 60000,
  });
  const job = response.data || {};
  return { jobId: job.id, status: job.status, model: job.model, fineTunedModel: job.fine_tuned_model || null, provider: "openai", operation: "fineTune" };
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  structuredOutput: opStructuredOutput,
  functionCalling: opFunctionCalling,
  reasoning: opReasoning,
  analyzeImage: opAnalyzeImage,
  generateImage: opGenerateImage,
  editImage: opEditImage,
  textToSpeech: opTextToSpeech,
  transcribeAudio: opTranscribeAudio,
  translateAudio: opTranslateAudio,
  embeddings: opEmbeddings,
  moderateContent: opModerateContent,
  analyzeDocument: opAnalyzeDocument,
  generatePrompt: opGeneratePrompt,
  improvePrompt: opImprovePrompt,
  imageVariation: opImageVariation,
  listModels: opListModels,
  fineTune: opFineTune,
};

// Live model list for the "fetch latest" button. Resolves the saved credential
// server-side — the API key is never exposed to the browser.
export async function listModels(credentialId, workspaceId) {
  const apiKey = await getApiKey(credentialId, workspaceId);
  const response = await axios.get(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000,
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
    if (!handler) throw new Error(`OpenAI: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId) return { success: false, error: "OpenAI: No credential selected.", skipped: true };

    let apiKey;
    try {
      apiKey = await getApiKey(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `OpenAI: Could not resolve credential — ${e.message}`, skipped: true };
    }

    try {
      return await handler(config, input, apiKey);
    } catch (err) {
      handleError(err, "OpenAI");
    }
  },
};
