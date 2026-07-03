/**
 * Anthropic — text-utility operations: classify, summarize, translate,
 * sentiment, moderateContent, codeReview, generatePrompt, improvePrompt.
 * Handlers receive `(config, input, apiKey)`. Bodies moved verbatim from the
 * monolith.
 */
import {
  DEFAULT_MODEL, DEFAULT_FAST_MODEL,
  callAnthropic, samplingParams, inputSummary, maybeJson,
} from "../GenericFunctions.js";

async function opClassify(config, input, apiKey) {
  const { model = DEFAULT_FAST_MODEL, maxTokens = 200 } = config;
  const labels = String(config.labels || "").split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  if (labels.length < 2) return { success: false, error: "Anthropic classify: provide at least 2 'labels' (comma-separated).", skipped: true };
  const text = config.prompt || config.text || input?.text || inputSummary(input);
  if (!text) return { success: false, error: "Anthropic classify: text to classify is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: `You are a classifier. Classify the input into exactly one of these categories: ${labels.join(", ")}. Respond with ONLY the category name, nothing else.`,
    content: String(text).substring(0, 20000), maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0 }),
  });

  const raw = r.text.trim();
  const matched = labels.find(l => l.toLowerCase() === raw.toLowerCase()) || labels.find(l => raw.toLowerCase().includes(l.toLowerCase())) || raw;
  return { label: matched, confident: labels.includes(matched), labels, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "classify" };
}

async function opSummarize(config, input, apiKey) {
  const { model = DEFAULT_MODEL, maxTokens = 1500, length = "medium", style = "paragraph" } = config;
  const text = config.prompt || config.text || input?.text || input?.content || inputSummary(input);
  if (!text) return { success: false, error: "Anthropic summarize: text to summarize is required.", skipped: true };

  const lengthHint = { short: "in 1-2 sentences", medium: "in a short paragraph", long: "in several detailed paragraphs" }[length] || "concisely";
  const styleHint = style === "bullets" ? "as a bulleted list" : style === "tldr" ? "as a single TL;DR line" : "as flowing prose";

  const r = await callAnthropic(apiKey, {
    model,
    system: `You are an expert summarizer. Summarize the input ${lengthHint}, ${styleHint}. Capture the key points faithfully.`,
    content: String(text).substring(0, 200000), maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.4 }),
  });

  return { summary: r.text, result: r.text, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "summarize" };
}

async function opTranslate(config, input, apiKey) {
  const { model = DEFAULT_MODEL, maxTokens = 4000, targetLanguage = "English" } = config;
  const text = config.prompt || config.text || input?.text || inputSummary(input);
  if (!text) return { success: false, error: "Anthropic translate: text to translate is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: `You are a professional translator. Translate the input into ${targetLanguage}. Preserve tone, formatting and meaning. Return ONLY the translation.`,
    content: String(text).substring(0, 100000), maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.3 }),
  });

  return { translation: r.text, result: r.text, targetLanguage, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "translate" };
}

async function opSentiment(config, input, apiKey) {
  const { model = DEFAULT_FAST_MODEL, maxTokens = 400 } = config;
  const text = config.prompt || config.text || input?.text || inputSummary(input);
  if (!text) return { success: false, error: "Anthropic sentiment: text to analyze is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: 'You are a sentiment analysis engine. Return ONLY a JSON object: {"sentiment":"positive|negative|neutral|mixed","score":-1..1,"emotions":["..."],"summary":"..."}',
    content: String(text).substring(0, 20000), maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0 }),
  });

  return { result: maybeJson(r.text), model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "sentiment" };
}

async function opModerateContent(config, input, apiKey) {
  const { model = DEFAULT_FAST_MODEL, maxTokens = 400 } = config;
  const text = config.prompt || config.text || input?.text || inputSummary(input);
  if (!text) return { success: false, error: "Anthropic moderateContent: text to moderate is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: 'You are a content safety classifier. Review the input and return ONLY JSON: {"flagged":bool,"categories":{"hate":bool,"harassment":bool,"violence":bool,"self_harm":bool,"sexual":bool,"illicit":bool},"reason":"..."}',
    content: String(text).substring(0, 20000), maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0 }),
  });

  const parsed = maybeJson(r.text);
  return { flagged: parsed?.flagged || false, categories: parsed?.categories || {}, reason: parsed?.reason, result: parsed, model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "moderateContent" };
}

async function opCodeReview(config, input, apiKey) {
  const { model = DEFAULT_MODEL, maxTokens = 4000 } = config;
  const code = config.code || (typeof input === "string" ? input : input?.code || inputSummary(input));
  if (!code) return { success: false, error: "Anthropic codeReview: 'code' is required.", skipped: true };
  const focus = config.focus || "bugs, security, performance, and readability";
  const system = "You are a senior staff engineer doing a rigorous code review. Be specific, cite line ranges, and prioritize by severity.";
  const content = `Review the following code. Focus on: ${focus}.\n\nReturn JSON: { "summary": string, "issues": [{ "severity": "high|medium|low", "line": string, "problem": string, "fix": string }] }\n\n---\nCode:\n${code}`;
  const r = await callAnthropic(apiKey, { model, system, content, maxTokens: Number(maxTokens), sampling: samplingParams(config, { temperature: 0.2 }) });
  return { result: maybeJson(r.text), model: r.model, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "codeReview" };
}

async function opGeneratePrompt(config, input, apiKey) {
  const { model = DEFAULT_FAST_MODEL, maxTokens = 1000 } = config;
  const taskDescription = config.task || config.prompt || input?.task || inputSummary(input);
  if (!taskDescription) return { success: false, error: "Anthropic generatePrompt: 'task' description is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: "You are an expert prompt engineer. Write clear, effective prompts for AI models. Return only the prompt text, no explanations.",
    content: `Write an effective AI prompt for this task: ${taskDescription}`, maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.8 }),
  });

  return { prompt: r.text, result: r.text, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "generatePrompt" };
}

async function opImprovePrompt(config, input, apiKey) {
  const { model = DEFAULT_FAST_MODEL, maxTokens = 1000 } = config;
  const originalPrompt = config.prompt || input?.prompt || input?.text || inputSummary(input);
  if (!originalPrompt) return { success: false, error: "Anthropic improvePrompt: 'prompt' to improve is required.", skipped: true };

  const r = await callAnthropic(apiKey, {
    model,
    system: "You are an expert prompt engineer. Rewrite and improve the given prompt to be clearer, more specific, and more effective. Return only the improved prompt, no explanations.",
    content: `Improve this prompt:\n\n${originalPrompt}`, maxTokens: Number(maxTokens),
    sampling: samplingParams(config, { temperature: 0.7 }),
  });

  return { improvedPrompt: r.text, result: r.text, originalPrompt, tokensUsed: r.tokensUsed, provider: "anthropic", operation: "improvePrompt" };
}

export const textOperations = {
  classify: opClassify,
  summarize: opSummarize,
  translate: opTranslate,
  sentiment: opSentiment,
  moderateContent: opModerateContent,
  codeReview: opCodeReview,
  generatePrompt: opGeneratePrompt,
  improvePrompt: opImprovePrompt,
};
