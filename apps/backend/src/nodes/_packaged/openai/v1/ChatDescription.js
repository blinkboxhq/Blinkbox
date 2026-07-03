/**
 * OpenAI — chat/completions-family operations: message, structuredOutput,
 * functionCalling, reasoning, analyzeDocument, generatePrompt, improvePrompt,
 * moderateContent, embeddings. Handlers receive `(config, input, apiKey)`.
 * Bodies moved verbatim from the monolith.
 */
import axios from "axios";
import {
  BASE, DEFAULT_CHAT_MODEL,
  inputSummary, samplingParams, resolveInlineRef,
} from "../GenericFunctions.js";

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

export const chatOperations = {
  message: opMessage,
  structuredOutput: opStructuredOutput,
  functionCalling: opFunctionCalling,
  reasoning: opReasoning,
  embeddings: opEmbeddings,
  moderateContent: opModerateContent,
  analyzeDocument: opAnalyzeDocument,
  generatePrompt: opGeneratePrompt,
  improvePrompt: opImprovePrompt,
};
