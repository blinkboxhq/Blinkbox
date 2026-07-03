/**
 * Sakana Fugu — chat/text operations: message, code, structuredOutput,
 * functionCalling, reasoning, analyzeDocument, extractData, classify, summarize,
 * translate, sentiment, generatePrompt, improvePrompt.
 * Handlers receive `(config, input, apiKey)`. Bodies moved verbatim from the monolith.
 */
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_THINK_MODEL,
  DEFAULT_CODE_MODEL,
  inputSummary,
  samplingParams,
  chat,
} from "../GenericFunctions.js";

async function opMessage(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt, outputFormat = "text" } = config;
  if (!prompt) return { success: false, error: "Sakana message: 'prompt' is required.", skipped: true };

  const systemMessage =
    config.systemPrompt ||
    (outputFormat === "json"
      ? "You are a data processing assistant. Always respond with valid JSON. No markdown fences, no explanations — just the JSON object."
      : "You are Fugu, a multi-agent AI orchestrator. Answer directly, or coordinate specialist models when the task warrants it.");

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
    ],
    ...samplingParams({ temperature: config.temperature ?? 0.6, maxTokens: config.maxTokens ?? 2000, ...config }),
    ...(outputFormat === "json" && { response_format: { type: "json_object" } }),
  }, 300000);

  const choice = data.choices?.[0];
  let result = choice?.message?.content || "";
  if (outputFormat === "json") {
    try { result = JSON.parse(result); } catch {
      const stripped = result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      try { result = JSON.parse(stripped); } catch { /* return raw text */ }
    }
  }

  return { result, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, finishReason: choice?.finish_reason, provider: "sakana", operation: "message" };
}

async function opCode(config, input, apiKey) {
  const { model = DEFAULT_CODE_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "Sakana code: 'prompt' is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: config.systemPrompt || "You are an expert software engineer. Respond with clean, correct, idiomatic code. Explain only when asked." },
      { role: "user", content: `${prompt}\n\n---\nContext:\n${inputSummary(input)}` },
    ],
    ...samplingParams({ temperature: config.temperature ?? 0.2, maxTokens: config.maxTokens ?? 4000, ...config }),
  }, 300000);

  return { result: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "sakana", operation: "code" };
}

async function opStructuredOutput(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "Sakana structuredOutput: 'prompt' is required.", skipped: true };

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
  return { result, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "sakana", operation: "structuredOutput" };
}

async function opFunctionCalling(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "Sakana functionCalling: 'prompt' is required.", skipped: true };

  let tools;
  try {
    tools = typeof config.tools === "string" ? JSON.parse(config.tools) : config.tools;
  } catch {
    return { success: false, error: "Sakana functionCalling: tools definition is not valid JSON.", skipped: true };
  }
  if (!Array.isArray(tools) || tools.length === 0) {
    return { success: false, error: "Sakana functionCalling: at least one tool/function is required.", skipped: true };
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
    provider: "sakana",
    operation: "functionCalling",
  };
}

async function opReasoning(config, input, apiKey) {
  const { model = DEFAULT_THINK_MODEL, prompt } = config;
  if (!prompt) return { success: false, error: "Sakana reasoning: 'prompt' is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: config.systemPrompt || "Reason carefully step by step, orchestrating specialist models as needed, before answering." },
      { role: "user", content: `${prompt}\n\n---\nInput Data:\n${inputSummary(input)}` },
    ],
    ...(config.maxTokens ? { max_tokens: Number(config.maxTokens) } : { max_tokens: 8192 }),
  }, 300000);

  const choice = data.choices?.[0];
  return {
    result: choice?.message?.content || "",
    reasoning: choice?.message?.reasoning_content || choice?.message?.reasoning,
    model: data.model || model,
    tokensUsed: data.usage?.total_tokens || 0,
    provider: "sakana",
    operation: "reasoning",
  };
}

async function opAnalyzeDocument(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, prompt = "Summarize this document." } = config;
  const documentText = config.documentText || input?.text || input?.content || input?.body || inputSummary(input);
  if (!documentText) return { success: false, error: "Sakana analyzeDocument: provide 'documentText' or pass document text as input.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are a document analysis assistant. Orchestrate specialist models if the document is long or technical." },
      { role: "user", content: `${prompt}\n\n---\nDocument:\n${String(documentText).substring(0, 200000)}` },
    ],
    ...samplingParams({ temperature: config.temperature ?? 0.3, maxTokens: config.maxTokens ?? 4000, ...config }),
  }, 300000);

  return { result: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "sakana", operation: "analyzeDocument" };
}

async function opExtractData(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const source = config.text || input?.text || inputSummary(input);
  const fields = config.fields || config.prompt;
  if (!source) return { success: false, error: "Sakana extractData: input text is required.", skipped: true };

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
  return { result, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "sakana", operation: "extractData" };
}

async function opClassify(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const source = config.text || input?.text || inputSummary(input);
  const labels = String(config.labels || config.categories || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!source) return { success: false, error: "Sakana classify: input text is required.", skipped: true };
  if (labels.length === 0) return { success: false, error: "Sakana classify: 'labels' (comma-separated) are required.", skipped: true };

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
  return { ...(typeof result === "object" ? result : { label: result }), labels, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "sakana", operation: "classify" };
}

async function opSummarize(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, style = "concise" } = config;
  const source = config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Sakana summarize: input text is required.", skipped: true };

  const lengthHint = config.maxWords ? ` in about ${config.maxWords} words` : "";
  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: `You are a summarization assistant. Produce a ${style} summary${lengthHint}.` },
      { role: "user", content: String(source).substring(0, 120000) },
    ],
    ...samplingParams({ temperature: config.temperature ?? 0.3, maxTokens: config.maxTokens ?? 1024 }),
  });

  return { summary: data.choices?.[0]?.message?.content || "", model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "sakana", operation: "summarize" };
}

async function opTranslate(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, targetLanguage = "English" } = config;
  const source = config.text || input?.text || (typeof input === "string" ? input : inputSummary(input));
  if (!source) return { success: false, error: "Sakana translate: input text is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: `You are a professional translator. Translate the user's text into ${targetLanguage}. Return only the translation, no notes.` },
      { role: "user", content: String(source).substring(0, 40000) },
    ],
    temperature: config.temperature ?? 0.2,
  });

  return { translation: data.choices?.[0]?.message?.content || "", targetLanguage, model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "sakana", operation: "translate" };
}

async function opSentiment(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const source = config.text || input?.text || inputSummary(input);
  if (!source) return { success: false, error: "Sakana sentiment: input text is required.", skipped: true };

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
  return { ...(typeof result === "object" ? result : { sentiment: result }), model: data.model || model, tokensUsed: data.usage?.total_tokens || 0, provider: "sakana", operation: "sentiment" };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL, task } = config;
  const taskDescription = task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "Sakana generatePrompt: 'task' description is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations." },
      { role: "user", content: `Write an effective AI prompt for this task: ${taskDescription}` },
    ],
    max_tokens: 1024,
    temperature: 0.8,
  });

  return { prompt: data.choices?.[0]?.message?.content || "", tokensUsed: data.usage?.total_tokens || 0, provider: "sakana", operation: "generatePrompt" };
}

async function opImprovePrompt(config, input, apiKey) {
  const { model = DEFAULT_CHAT_MODEL } = config;
  const originalPrompt = config.prompt || input?.prompt || input?.text || inputSummary(input);
  if (!originalPrompt) return { success: false, error: "Sakana improvePrompt: 'prompt' to improve is required.", skipped: true };

  const data = await chat(apiKey, {
    model,
    messages: [
      { role: "system", content: "You are an expert prompt engineer. Rewrite and improve the given prompt to be clearer, more specific, and more effective. Return only the improved prompt, no explanations." },
      { role: "user", content: `Improve this prompt:\n\n${originalPrompt}` },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  return { improvedPrompt: data.choices?.[0]?.message?.content || "", originalPrompt, tokensUsed: data.usage?.total_tokens || 0, provider: "sakana", operation: "improvePrompt" };
}

export const chatOperations = {
  message: opMessage,
  code: opCode,
  structuredOutput: opStructuredOutput,
  functionCalling: opFunctionCalling,
  reasoning: opReasoning,
  analyzeDocument: opAnalyzeDocument,
  extractData: opExtractData,
  classify: opClassify,
  summarize: opSummarize,
  translate: opTranslate,
  sentiment: opSentiment,
  generatePrompt: opGeneratePrompt,
  improvePrompt: opImprovePrompt,
};
