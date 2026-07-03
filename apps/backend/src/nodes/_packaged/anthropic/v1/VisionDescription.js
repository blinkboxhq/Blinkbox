/**
 * Anthropic — vision / document operations: analyzeImage, analyzePdf,
 * analyzeDocument, extractData. Media references are resolved (SSRF-guarded)
 * via GenericFunctions. Handlers receive `(config, input, apiKey)`. Bodies
 * moved verbatim from the monolith.
 */
import {
  DEFAULT_MODEL, DEFAULT_VISION_MODEL,
  callAnthropic, samplingParams, inputSummary, maybeJson, resolveMediaSource,
} from "../GenericFunctions.js";

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

export const visionOperations = {
  analyzeImage: opAnalyzeImage,
  analyzeDocument: opAnalyzeDocument,
  analyzePdf: opAnalyzePdf,
  extractData: opExtractData,
};
