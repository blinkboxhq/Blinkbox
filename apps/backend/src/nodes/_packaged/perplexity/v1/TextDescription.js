/**
 * Perplexity (Sonar) — text-transform operations: extractData, classify,
 * summarize, translate, analyzeDocument, generatePrompt.
 * Handlers receive `(config, input, apiKey)`. Bodies moved verbatim from the monolith.
 */
import {
  inputSummary,
  maybeJson,
  samplingBody,
  callPerplexity,
} from "../GenericFunctions.js";

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

export const textOperations = {
  extractData: opExtractData,
  classify: opClassify,
  summarize: opSummarize,
  translate: opTranslate,
  analyzeDocument: opAnalyzeDocument,
  generatePrompt: opGeneratePrompt,
};
