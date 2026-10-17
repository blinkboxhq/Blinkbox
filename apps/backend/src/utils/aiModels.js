// Model lineups, retired-ID mapping and per-model request shaping for the AI
// nodes. Checked against the provider docs and live model lists on 2026-10-17:
//   OpenAI    developers.openai.com/api/docs/models + /deprecations
//   Anthropic Claude models overview (claude-api skill, cached 2026-10-06)
//   Gemini    ai.google.dev/gemini-api/docs/models + /deprecations
//   xAI       docs.x.ai/docs/models
//   DeepSeek  api-docs.deepseek.com/updates
//   Perplexity docs.perplexity.ai/getting-started/models
//   OpenRouter / NVIDIA NIM  their public /v1/models lists
//
// Saved workflows keep the model ID they were built with. resolveModel() only
// swaps an ID once the provider has shut it down (or for IDs that never
// existed), so a node that works today keeps calling the same model.

export const AI_MODELS = {
  openai: {
    default: "gpt-6.1-sol",
    tools: "gpt-6-sol",
    fast: "gpt-6-luna",
    flagship: "gpt-6-astra",
    image: "gpt-image-2.5-flare",
    embedding: "text-embedding-3-small",
    tts: "gpt-4o-mini-tts",
    transcription: "gpt-transcribe",
  },
  anthropic: {
    default: "claude-sonnet-5-5",
    fast: "claude-haiku-5-5",
    flagship: "claude-opus-5-5",
    top: "claude-fable-5-1",
  },
  gemini: {
    default: "gemini-3.8-flash",
    pro: "gemini-4-argon",
    lite: "gemini-3.5-flash-lite",
    image: "gemini-nano-banana-2.1",
    embedding: "gemini-embedding-2",
  },
  xai: { default: "grok-4.7", image: "grok-imagine-image-2.0" },
  deepseek: { default: "deepseek-flash", pro: "deepseek-v4-pro" },
  perplexity: { default: "sonar-pro", fast: "sonar", reasoning: "sonar-reasoning-pro", research: "sonar-deep-research" },
  openrouter: { default: "anthropic/claude-sonnet-5.5" },
  groq: { default: "llama-3.3-70b-versatile" },
};

// Dropdown lineups, newest first. Older-but-live IDs stay selectable at the end.
export const MODEL_LINEUPS = {
  openai: ["gpt-6-astra", "gpt-6.1-sol", "gpt-6-sol", "gpt-6-luna", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5.4", "gpt-5.4-mini"],
  anthropic: ["claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5", "claude-sonnet-5", "claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"],
  gemini: ["gemini-4-argon", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-2.5-pro", "gemini-2.5-flash"],
  perplexity: ["sonar-pro", "sonar", "sonar-reasoning-pro", "sonar-deep-research"],
  xai: ["grok-4.7", "grok-4.6", "grok-4.5", "grok-4.3", "grok-4.20-0309-reasoning", "grok-4.20-0309-non-reasoning"],
  deepseek: ["deepseek-flash", "deepseek-v4-pro"],
  moonshot: ["kimi-k3", "kimi-k2.7-code", "kimi-k2.6", "kimi-k2-thinking"],
  openrouter: ["anthropic/claude-sonnet-5.5", "anthropic/claude-opus-5.5", "openai/gpt-6.1-sol", "openai/gpt-6-luna", "google/gemini-3.8-flash", "google/gemini-4-argon", "x-ai/grok-4.7", "deepseek/deepseek-v4-pro", "moonshotai/kimi-k3", "z-ai/glm-5.3", "minimax/minimax-m3"],
  zai: ["glm-5.3", "glm-5.2", "glm-5.1", "glm-4.7"],
  minimax: ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.5", "MiniMax-M2"],
  sakana: ["fugu", "fugu-ultra"],
  nvidia_nim: ["nvidia/nemotron-3-ultra-550b-a55b", "nvidia/nemotron-3-super-120b-a12b", "deepseek-ai/deepseek-v4.1-flash", "moonshotai/kimi-k2.6", "z-ai/glm-5.3", "google/gemma-4-31b-it"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "moonshotai/kimi-k2-instruct", "qwen/qwen3-32b"],
};

// `on` = the provider's shutdown date. Before it the old ID is left alone.
const RETIRED = {
  openai: {
    // Never existed under these names (older Blinkbox dropdowns listed them).
    "gpt-5.6-mini": { to: "gpt-5.6-terra" },
    "gpt-5.3-instant": { to: "gpt-5.6-sol" },
    "gpt-4.5-preview": { to: "gpt-5.6-sol" },
    "o1-preview": { to: "gpt-5.6-sol" },
    "o1-mini": { to: "gpt-5.6-terra" },
    "codex-mini-latest": { to: "gpt-5.6-terra" },
    "chatgpt-4o-latest": { to: "gpt-5.6-sol" },
    "gpt-4-0314": { to: "gpt-5.6-sol" },
    "gpt-4-1106-preview": { to: "gpt-5.6-sol" },
    "gpt-4-0125-preview": { to: "gpt-5.6-sol" },
    "gpt-4-turbo-preview": { to: "gpt-5.6-sol" },
    "dall-e-2": { to: "gpt-image-2.5-flare" },
    "dall-e-3": { to: "gpt-image-2.5-flare" },
    "computer-use-preview": { to: "gpt-5.6-terra" },
    "gpt-4o-search-preview": { to: "gpt-5.6-terra" },
    "gpt-4o-mini-search-preview": { to: "gpt-5.6-terra" },
    "gpt-5-chat-latest": { to: "gpt-5.6-sol" },
    "gpt-5-codex": { to: "gpt-5.6-sol" },
    "gpt-5.1-chat-latest": { to: "gpt-5.6-sol" },
    "gpt-5.1-codex": { to: "gpt-5.6-sol" },
    "gpt-5.1-codex-max": { to: "gpt-5.6-sol" },
    "gpt-5.1-codex-mini": { to: "gpt-5.6-terra" },
    "gpt-5.2-codex": { to: "gpt-5.6-sol" },
    "o3-deep-research": { to: "gpt-5.6-sol" },
    "o4-mini-deep-research": { to: "gpt-5.6-sol" },
    "gpt-5.2-chat-latest": { to: "gpt-5.6-sol" },
    "gpt-5.3-chat-latest": { to: "gpt-5.6-sol" },
    "gpt-3.5-turbo-instruct": { to: "gpt-5.6-terra" },
    "gpt-3.5-turbo-1106": { to: "gpt-5.6-terra" },
    "babbage-002": { to: "gpt-5.6-terra" },
    "davinci-002": { to: "gpt-5.6-terra" },
    "gpt-3.5-turbo": { to: "gpt-5.6-terra", on: "2026-10-23" },
    "gpt-3.5-turbo-0125": { to: "gpt-5.6-terra", on: "2026-10-23" },
    "gpt-4": { to: "gpt-5.6-sol", on: "2026-10-23" },
    "gpt-4-0613": { to: "gpt-5.6-sol", on: "2026-10-23" },
    "gpt-4-turbo": { to: "gpt-5.6-sol", on: "2026-10-23" },
    "gpt-4-turbo-2024-04-09": { to: "gpt-5.6-sol", on: "2026-10-23" },
    "gpt-4o-2024-05-13": { to: "gpt-5.6-sol", on: "2026-10-23" },
    "o1": { to: "gpt-5.6-sol", on: "2026-10-23" },
    "o1-2024-12-17": { to: "gpt-5.6-sol", on: "2026-10-23" },
    "o1-pro": { to: "gpt-5.6-sol", on: "2026-10-23" },
    "o3-mini": { to: "gpt-5.6-sol", on: "2026-10-23" },
    "o4-mini": { to: "gpt-5.6-terra", on: "2026-10-23" },
    "gpt-4.1-nano": { to: "gpt-5.6-luna", on: "2026-10-23" },
    "gpt-4.1-nano-2025-04-14": { to: "gpt-5.6-luna", on: "2026-10-23" },
    "gpt-image-1": { to: "gpt-image-2.5-flare", on: "2026-10-23" },
    "gpt-image-1-mini": { to: "gpt-image-2.5-flare", on: "2026-12-01" },
    "gpt-image-1.5": { to: "gpt-image-2.5-flare", on: "2026-12-01" },
    "chatgpt-image-latest": { to: "gpt-image-2.5-flare", on: "2026-12-01" },
    "gpt-5": { to: "gpt-5.6-sol", on: "2026-12-11" },
    "gpt-5-2025-08-07": { to: "gpt-5.6-sol", on: "2026-12-11" },
    "gpt-5-mini": { to: "gpt-5.6-terra", on: "2026-12-11" },
    "gpt-5-mini-2025-08-07": { to: "gpt-5.6-terra", on: "2026-12-11" },
    "gpt-5-nano": { to: "gpt-5.6-luna", on: "2026-12-11" },
    "gpt-5-nano-2025-08-07": { to: "gpt-5.6-luna", on: "2026-12-11" },
    "gpt-5-pro": { to: "gpt-5.6-sol", on: "2026-12-11" },
    "o3": { to: "gpt-5.6-sol", on: "2026-12-11" },
    "o3-pro": { to: "gpt-5.6-sol", on: "2026-12-11" },
    "gpt-4o": { to: "gpt-6-luna", on: "2027-01-14" },
    "gpt-4o-2024-08-06": { to: "gpt-6-luna", on: "2027-01-14" },
    "gpt-4o-2024-11-20": { to: "gpt-6-luna", on: "2027-01-14" },
    "gpt-4o-mini": { to: "gpt-6-luna", on: "2027-01-14" },
    "gpt-4o-mini-2024-07-18": { to: "gpt-6-luna", on: "2027-01-14" },
    "gpt-4.1": { to: "gpt-6-luna", on: "2027-01-14" },
    "gpt-4.1-2025-04-14": { to: "gpt-6-luna", on: "2027-01-14" },
    "gpt-4.1-mini": { to: "gpt-6-luna", on: "2027-01-14" },
    "gpt-4.1-mini-2025-04-14": { to: "gpt-6-luna", on: "2027-01-14" },
    "gpt-5.1": { to: "gpt-6-sol", on: "2027-04-01" },
    "gpt-5.3-codex": { to: "gpt-6-sol", on: "2027-04-01" },
    "gpt-5.4-nano": { to: "gpt-6-luna", on: "2027-04-01" },
  },
  anthropic: {
    "claude-3-7-sonnet-20250219": { to: "claude-sonnet-5-5" },
    "claude-3-7-sonnet-latest": { to: "claude-sonnet-5-5" },
    "claude-3-5-sonnet-20241022": { to: "claude-sonnet-5-5" },
    "claude-3-5-sonnet-20240620": { to: "claude-sonnet-5-5" },
    "claude-3-5-sonnet-latest": { to: "claude-sonnet-5-5" },
    "claude-3-sonnet-20240229": { to: "claude-sonnet-5-5" },
    "claude-3-5-haiku-20241022": { to: "claude-haiku-5-5" },
    "claude-3-5-haiku-latest": { to: "claude-haiku-5-5" },
    "claude-3-haiku-20240307": { to: "claude-haiku-5-5", on: "2026-04-19" },
    "claude-3-opus-20240229": { to: "claude-opus-5-5" },
    "claude-3-opus-latest": { to: "claude-opus-5-5" },
    "claude-2.1": { to: "claude-sonnet-5-5" },
    "claude-2.0": { to: "claude-sonnet-5-5" },
    "claude-instant-1.2": { to: "claude-haiku-5-5" },
    "claude-opus-4-1": { to: "claude-opus-5-5", on: "2026-08-05" },
    "claude-opus-4-1-20250805": { to: "claude-opus-5-5", on: "2026-08-05" },
  },
  gemini: {
    "gemini-pro": { to: "gemini-4-argon" },
    "gemini-1.0-pro": { to: "gemini-4-argon" },
    "gemini-1.5-pro": { to: "gemini-4-argon" },
    "gemini-1.5-pro-latest": { to: "gemini-4-argon" },
    "gemini-1.5-pro-001": { to: "gemini-4-argon" },
    "gemini-1.5-pro-002": { to: "gemini-4-argon" },
    "gemini-1.5-flash": { to: "gemini-3.8-flash" },
    "gemini-1.5-flash-latest": { to: "gemini-3.8-flash" },
    "gemini-1.5-flash-001": { to: "gemini-3.8-flash" },
    "gemini-1.5-flash-002": { to: "gemini-3.8-flash" },
    "gemini-1.5-flash-8b": { to: "gemini-3.5-flash-lite" },
    "gemini-2.0-flash": { to: "gemini-3.6-flash", on: "2026-06-01" },
    "gemini-2.0-flash-001": { to: "gemini-3.6-flash", on: "2026-06-01" },
    "gemini-2.0-flash-exp": { to: "gemini-3.6-flash" },
    "gemini-2.0-flash-lite": { to: "gemini-3.1-flash-lite", on: "2026-06-01" },
    "gemini-2.0-flash-lite-001": { to: "gemini-3.1-flash-lite", on: "2026-06-01" },
    "gemini-2.0-flash-lite-preview": { to: "gemini-2.5-flash-lite" },
    "gemini-2.0-flash-lite-preview-02-05": { to: "gemini-2.5-flash-lite" },
    "gemini-2.0-pro-exp": { to: "gemini-4-argon" },
    "gemini-2.5-pro-preview-03-25": { to: "gemini-3.1-pro-preview" },
    "gemini-2.5-pro-preview-05-06": { to: "gemini-3.1-pro-preview" },
    "gemini-2.5-pro-preview-06-05": { to: "gemini-3.1-pro-preview" },
    "gemini-2.5-flash-preview-05-20": { to: "gemini-3.6-flash" },
    "gemini-2.5-flash-preview-09-25": { to: "gemini-3.6-flash" },
    "gemini-2.5-flash-lite-preview-09-2025": { to: "gemini-3.1-flash-lite" },
    "gemini-3-pro-preview": { to: "gemini-3.1-pro-preview", on: "2026-03-09" },
    "gemini-3.1-flash-lite-preview": { to: "gemini-3.1-flash-lite", on: "2026-05-25" },
    // Listed by older Blinkbox dropdowns; Google never shipped these IDs.
    "gemini-3.5-pro": { to: "gemini-4-argon" },
    "gemini-3.1-flash": { to: "gemini-3.8-flash" },
    // Image models
    "gemini-2.0-flash-preview-image-generation": { to: "gemini-nano-banana-2.1" },
    "gemini-2.0-flash-exp-image-generation": { to: "gemini-nano-banana-2.1" },
    "gemini-2.5-flash-image-preview": { to: "gemini-nano-banana-2.1" },
    "gemini-3.1-flash-image-preview": { to: "gemini-nano-banana-2.1", on: "2026-06-25" },
    "gemini-3-pro-image-preview": { to: "gemini-3-pro-image", on: "2026-06-25" },
    // Embeddings
    "text-embedding-004": { to: "gemini-embedding-2", on: "2026-01-14" },
    "embedding-001": { to: "gemini-embedding-2" },
    "embedding-2-preview": { to: "gemini-embedding-2", on: "2026-08-10" },
    "gemini-embedding-exp": { to: "gemini-embedding-2" },
    "gemini-embedding-exp-03-07": { to: "gemini-embedding-2" },
  },
  xai: {
    "grok-beta": { to: "grok-4.7" },
    "grok-vision-beta": { to: "grok-4.7" },
    "grok-2": { to: "grok-4.7" },
    "grok-2-1212": { to: "grok-4.7" },
    "grok-2-latest": { to: "grok-4.7" },
    "grok-2-vision": { to: "grok-4.7" },
    "grok-2-vision-1212": { to: "grok-4.7" },
    "grok-2-vision-latest": { to: "grok-4.7" },
    "grok-2-image": { to: "grok-imagine-image-2.0" },
    "grok-2-image-1212": { to: "grok-imagine-image-2.0" },
    "grok-2-image-latest": { to: "grok-imagine-image-2.0" },
    // Never-shipped spellings from older dropdowns.
    "grok-4.1": { to: "grok-4.7" },
    "grok-code-fast": { to: "grok-4.7" },
  },
  deepseek: {
    "deepseek-chat": { to: "deepseek-flash", on: "2026-07-24" },
    "deepseek-reasoner": { to: "deepseek-flash", on: "2026-07-24" },
  },
  perplexity: {
    "sonar-reasoning": { to: "sonar-reasoning-pro" },
    "llama-3-sonar-small-32k-online": { to: "sonar" },
    "llama-3-sonar-large-32k-online": { to: "sonar-pro" },
    "llama-3-sonar-small-32k-chat": { to: "sonar" },
    "llama-3-sonar-large-32k-chat": { to: "sonar-pro" },
    "llama-3.1-sonar-small-128k-online": { to: "sonar" },
    "llama-3.1-sonar-large-128k-online": { to: "sonar-pro" },
    "llama-3.1-sonar-huge-128k-online": { to: "sonar-pro" },
    "llama-3.1-sonar-small-128k-chat": { to: "sonar" },
    "llama-3.1-sonar-large-128k-chat": { to: "sonar-pro" },
  },
  openrouter: {
    "anthropic/claude-3.5-sonnet": { to: "anthropic/claude-sonnet-5.5" },
    "anthropic/claude-3.7-sonnet": { to: "anthropic/claude-sonnet-5.5" },
    "anthropic/claude-3.5-haiku": { to: "anthropic/claude-haiku-5.5" },
    "anthropic/claude-3-opus": { to: "anthropic/claude-opus-5.5" },
    "anthropic/claude-opus-4-8": { to: "anthropic/claude-opus-4.8" },
    "anthropic/claude-haiku-4-5": { to: "anthropic/claude-haiku-4.5" },
    "openai/gpt-5.6": { to: "openai/gpt-5.6-sol" },
    "openai/gpt-5.6-mini": { to: "openai/gpt-5.6-terra" },
    "google/gemini-3.5-pro": { to: "google/gemini-4-argon" },
    "x-ai/grok-4-fast": { to: "x-ai/grok-4.7" },
  },
  groq: {
    "mixtral-8x7b-32768": { to: "llama-3.3-70b-versatile" },
  },
};

function todayISO(now) {
  return (now instanceof Date ? now : new Date()).toISOString().slice(0, 10);
}

// Returns the ID to send. Unknown or live IDs pass through untouched.
export function resolveModel(provider, model, { now } = {}) {
  if (typeof model !== "string") return model;
  const id = model.trim();
  const entry = RETIRED[provider]?.[id];
  if (!entry) return id;
  if (entry.on && todayISO(now) < entry.on) return id;
  return entry.to;
}

export function isRetiredModel(provider, model, opts) {
  return typeof model === "string" && resolveModel(provider, model, opts) !== model.trim();
}

// Thinking/reasoning tokens share the output cap on every provider below.
export const REASONING_TOKEN_FLOOR = 16000;

// ── OpenAI ───────────────────────────────────────────────────────────────────

// GPT-5+, GPT-6 and o-series are reasoning models: they take
// max_completion_tokens, and sampling params only when reasoning effort is
// "none". gpt-oss and the chat-latest aliases are not.
export function isOpenAIReasoningModel(model) {
  const id = String(model || "").replace(/^openai\//, "");
  if (/chat-latest$/.test(id)) return false;
  return /^(o\d|gpt-5|gpt-6)/.test(id);
}

// GPT-6 Astra and GPT-6.1 Sol reject "none" effort and cannot call tools over
// Chat Completions; GPT-6 Sol/Luna call tools there only at effort "none".
const OPENAI_NO_NONE_EFFORT = /^(gpt-6-astra|gpt-6\.1-sol)/;
const OPENAI_TOOLS_NEED_NONE = /^(gpt-6-sol|gpt-6-luna)/;

export function openaiChatToolsUnsupported(model) {
  return OPENAI_NO_NONE_EFFORT.test(String(model || ""));
}

// Rewrites a Chat Completions body in place for the target model.
export function shapeOpenAIChatBody(body) {
  const model = String(body.model || "");
  if (!isOpenAIReasoningModel(model)) return body;

  if (body.max_tokens !== undefined) {
    if (body.max_completion_tokens === undefined) body.max_completion_tokens = body.max_tokens;
    delete body.max_tokens;
  }

  const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
  if (hasTools && OPENAI_TOOLS_NEED_NONE.test(model)) body.reasoning_effort = "none";
  if (body.reasoning_effort === "minimal" && /^gpt-6/.test(model)) body.reasoning_effort = "low";
  if (body.reasoning_effort === "none" && OPENAI_NO_NONE_EFFORT.test(model)) body.reasoning_effort = "low";

  if (body.reasoning_effort !== "none") {
    // Reasoning tokens count against the cap; a small cap returns empty text.
    if (Number(body.max_completion_tokens) > 0) body.max_completion_tokens = Math.max(Number(body.max_completion_tokens), REASONING_TOKEN_FLOOR);
    for (const k of ["temperature", "top_p", "logprobs", "top_logprobs", "presence_penalty", "frequency_penalty", "logit_bias"]) delete body[k];
  }
  return body;
}

// ── Anthropic ────────────────────────────────────────────────────────────────

const strip = (m) => String(m || "").replace(/^anthropic\//, "").replace(/^anthropic\./, "");

// Opus 4.7+, Sonnet 5+, Haiku 5.5, Fable/Mythos: no temperature/top_p/top_k,
// no budget_tokens thinking (adaptive only).
export function isAnthropicAdaptiveOnly(model) {
  const id = strip(model);
  return /^claude-(fable|mythos)/.test(id)
    || /^claude-opus-(4-[78]|5)/.test(id)
    || /^claude-sonnet-5/.test(id)
    || /^claude-haiku-5/.test(id);
}

// Fable 5.1, Mythos 5.1, Opus 5.5, Sonnet 5.5 400 on forced tool_choice.
export function anthropicRejectsForcedTools(model) {
  return /^claude-(fable-5-1|mythos-5-1|opus-5-5|sonnet-5-5)/.test(strip(model));
}

// Models that think when `thinking` is omitted.
function anthropicThinksByDefault(model) {
  return /^claude-(fable|mythos|opus-5|sonnet-5|haiku-5)/.test(strip(model));
}

// Thinking can't be turned off on Fable, Opus 5.5 and Sonnet 5.5.
function anthropicThinkingAlwaysOn(model) {
  return /^claude-(fable|mythos|opus-5-5|sonnet-5-5)/.test(strip(model));
}

// Rewrites a Messages API body in place for the target model.
export function shapeAnthropicBody(body) {
  const model = body.model;
  if (!isAnthropicAdaptiveOnly(model)) return body;

  delete body.temperature;
  delete body.top_p;
  delete body.top_k;

  if (body.thinking) {
    // A caller that asked for a budget wants to read the reasoning back.
    if (body.thinking.type === "enabled") body.thinking = { type: "adaptive", display: "summarized" };
    else if (body.thinking.type === "disabled" && anthropicThinkingAlwaysOn(model)) delete body.thinking;
  }

  const thinking = body.thinking ? body.thinking.type !== "disabled" : anthropicThinksByDefault(model);
  if (thinking && Number(body.max_tokens) > 0) body.max_tokens = Math.max(Number(body.max_tokens), REASONING_TOKEN_FLOOR);

  const tc = body.tool_choice;
  if (tc && (tc.type === "any" || tc.type === "tool") && anthropicRejectsForcedTools(model)) {
    const name = tc.type === "tool" ? tc.name : null;
    body.tool_choice = { type: "auto" };
    const nudge = name
      ? `Respond by calling the \`${name}\` tool.`
      : "Respond by calling one of the provided tools.";
    if (typeof body.system === "string" && body.system) body.system = `${body.system}\n\n${nudge}`;
    else if (Array.isArray(body.system)) body.system = [...body.system, { type: "text", text: nudge }];
    else body.system = nudge;
  }
  return body;
}

// ── Gemini ───────────────────────────────────────────────────────────────────

// Gemini 3+ loops or degrades below the default temperature of 1.0, so only
// send one when the user set it explicitly.
export function isGemini3Plus(model) {
  return /^(models\/)?gemini-([3-9]|\d{2})/.test(String(model || "").replace(/^google\//, ""));
}
