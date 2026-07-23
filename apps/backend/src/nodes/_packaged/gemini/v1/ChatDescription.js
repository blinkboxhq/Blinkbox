/**
 * Gemini — text/reasoning operations: message, structuredOutput, functionCalling,
 * reasoning, analyzeDocument, extractData, classify, summarize, translate,
 * generatePrompt, countTokens. Handlers receive `(config, input, apiKey)`.
 * Bodies moved verbatim from the monolith.
 */
import axios from "axios";
import {
  MODELS_URL,
  inputSummary, maybeJson, generationConfig, callGemini,
} from "../GenericFunctions.js";

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

async function opCountTokens(config, input, apiKey) {
  const { model = "gemini-3.5-flash" } = config;
  const source = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!source) return { success: false, error: "Gemini countTokens: provide text to count.", skipped: true };

  const response = await axios.post(
    `${MODELS_URL}/${model}:countTokens`,
    { contents: [{ role: "user", parts: [{ text: String(source) }] }] },
    { headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, timeout: 120000 },
  );

  return {
    totalTokens: response.data.totalTokens || 0,
    model, provider: "gemini", operation: "countTokens",
  };
}

export const chatOperations = {
  message: opMessage,
  structuredOutput: opStructuredOutput,
  functionCalling: opFunctionCalling,
  reasoning: opReasoning,
  analyzeDocument: opAnalyzeDocument,
  extractData: opExtractData,
  classify: opClassify,
  summarize: opSummarize,
  translate: opTranslate,
  generatePrompt: opGeneratePrompt,
  countTokens: opCountTokens,
};
