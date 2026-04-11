/**
 * OLLAMA NODE
 *
 * Multi-operation local Ollama node. OpenAI-compatible API.
 * No API key required — runs on localhost:11434 (configurable via baseUrl).
 *
 * Config:
 *   operation    — "message" | "analyzeImage" | "generateEmbedding" (default: "message")
 *   model        — model name (default per operation)
 *   prompt       — instruction / user message
 *   baseUrl      — Ollama server URL (default: "http://localhost:11434")
 *   outputFormat — "json" | "text" (default: "text")
 *   temperature  — 0-2 (default: 0.7)
 *   maxTokens    — max response tokens (default: 2000)
 *
 *   ── analyzeImage ──
 *   imageUrl     — public URL or base64 data URI (requires a vision model like llava, bakllava, moondream)
 *
 *   ── generateEmbedding ──
 *   text         — text to embed (falls back to prompt or input text)
 *   embeddingModel — embedding model (default: "nomic-embed-text")
 *
 * OPERATIONS:
 *   message          — Chat completion with any local model
 *   analyzeImage     — Vision with llava/bakllava/moondream models
 *   generateEmbedding — Generate a text embedding vector
 *
 * Output varies by operation.
 */

import axios from "axios";

function handleError(err) {
  if (err.message.startsWith("Ollama")) throw err;
  if (err.code === "ECONNREFUSED") throw new Error("Ollama: Server not running. Start with 'ollama serve'.");
  if (err.code === "ENOTFOUND") throw new Error(`Ollama: Cannot reach server. Check 'baseUrl' in config.`);
  throw new Error(`Ollama failed: ${err.response?.status || err.code} — ${err.response?.data?.error || err.message}`);
}

function inputSummary(input) {
  return typeof input === "string" ? input : JSON.stringify(input, null, 2).substring(0, 15000);
}

const ALLOWED_OLLAMA_HOSTS = /^(localhost|127\.0\.0\.1|::1)(:\d+)?$/i;

function getBaseUrl(config) {
  const raw = (config.baseUrl || "http://localhost:11434").replace(/\/$/, "");
  try {
    const { hostname, port } = new URL(raw);
    const hostPort = port ? `${hostname}:${port}` : hostname;
    if (!ALLOWED_OLLAMA_HOSTS.test(hostPort)) {
      throw new Error(
        `Ollama: 'baseUrl' must point to localhost (got "${hostname}"). ` +
        "Remote Ollama instances are not supported for security reasons.",
      );
    }
  } catch (err) {
    if (err.message.startsWith("Ollama:")) throw err;
    throw new Error(`Ollama: Invalid 'baseUrl': ${raw}`);
  }
  return raw;
}

// ── Operation handlers ──────────────────────────────────────────────────────

async function opMessage(config, input) {
  const {
    model = "llama3",
    prompt,
    outputFormat = "text",
    temperature = 0.7,
    maxTokens = 2000,
  } = config;

  if (!prompt) throw new Error("Ollama message: 'prompt' is required.");

  const baseUrl = getBaseUrl(config);
  const systemMessage = outputFormat === "json"
    ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
    : "You are a helpful assistant. Respond clearly and concisely.";

  const response = await axios.post(
    `${baseUrl}/v1/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(outputFormat === "json" && { response_format: { type: "json_object" } }),
    },
    { headers: { "Content-Type": "application/json" }, timeout: 120000 },
  );

  const choice = response.data.choices?.[0];
  let result = choice?.message?.content || "";

  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return {
    result,
    model: response.data.model || model,
    tokensUsed: response.data.usage?.total_tokens || 0,
    provider: "ollama",
    operation: "message",
  };
}

async function opAnalyzeImage(config, input) {
  // Uses the native Ollama /api/chat endpoint which supports images directly
  const {
    model = "llava",
    prompt = "Describe this image in detail.",
    maxTokens = 1000,
  } = config;

  const imageUrl = config.imageUrl || input?.imageUrl || input?.url;
  if (!imageUrl) throw new Error("Ollama analyzeImage: 'imageUrl' is required.");

  const baseUrl = getBaseUrl(config);

  // Convert to base64 for Ollama native endpoint
  let base64Image;
  if (imageUrl.startsWith("data:")) {
    base64Image = imageUrl.split(",")[1];
  } else {
    if (!/^https?:\/\//i.test(imageUrl)) {
      throw new Error("Ollama analyzeImage: imageUrl must be an http/https URL.");
    }
    const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000, maxContentLength: 10 * 1024 * 1024 });
    base64Image = Buffer.from(imgResponse.data).toString("base64");
  }

  // Ollama native /api/chat with images
  const response = await axios.post(
    `${baseUrl}/api/chat`,
    {
      model,
      messages: [{
        role: "user",
        content: prompt,
        images: [base64Image],
      }],
      options: { num_predict: maxTokens },
      stream: false,
    },
    { headers: { "Content-Type": "application/json" }, timeout: 120000 },
  );

  const result = response.data.message?.content || "";
  return { result, model, provider: "ollama", operation: "analyzeImage" };
}

async function opGenerateEmbedding(config, input) {
  const { embeddingModel = "nomic-embed-text" } = config;
  const text = config.text || config.prompt || input?.text || inputSummary(input);
  if (!text) throw new Error("Ollama generateEmbedding: text to embed is required.");

  const baseUrl = getBaseUrl(config);

  const response = await axios.post(
    `${baseUrl}/api/embed`,
    { model: embeddingModel, input: text.substring(0, 8192) },
    { headers: { "Content-Type": "application/json" }, timeout: 60000 },
  );

  const embeddings = response.data.embeddings?.[0] || response.data.embedding || [];
  return {
    embedding: embeddings,
    dimensions: embeddings.length,
    model: embeddingModel,
    provider: "ollama",
    operation: "generateEmbedding",
  };
}

// ── Main export ─────────────────────────────────────────────────────────────

const OPERATIONS = {
  message: opMessage,
  analyzeImage: opAnalyzeImage,
  generateEmbedding: opGenerateEmbedding,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "message";
    const handler = OPERATIONS[operation];
    if (!handler) throw new Error(`Ollama: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    try {
      return await handler(config, input);
    } catch (err) {
      handleError(err);
    }
  },
};
