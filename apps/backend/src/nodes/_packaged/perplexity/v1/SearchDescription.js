/**
 * Perplexity (Sonar) — grounded/search operations: message, search,
 * askWithCitations, structuredOutput, reasoning, deepResearch, factCheck,
 * compare, newsDigest. Handlers receive `(config, input, apiKey)`.
 * Bodies moved verbatim from the monolith.
 */
import {
  inputSummary,
  maybeJson,
  samplingBody,
  searchFilters,
  callPerplexity,
} from "../GenericFunctions.js";

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

export const searchOperations = {
  message: opMessage,
  search: opSearch,
  askWithCitations: opAskWithCitations,
  structuredOutput: opStructuredOutput,
  reasoning: opReasoning,
  deepResearch: opDeepResearch,
  factCheck: opFactCheck,
  compare: opCompare,
  newsDigest: opNewsDigest,
};
