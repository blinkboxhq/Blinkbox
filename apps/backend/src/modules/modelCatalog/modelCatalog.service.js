const bearer = (key) => ({ Authorization: `Bearer ${key}` });

// Fixed provider URLs only — never interpolate user input into these (SSRF guard).
const PROVIDERS = {
  openai: {
    url: "https://api.openai.com/v1/models",
    headers: bearer,
    parse: (j) =>
      (j.data || [])
        .sort((a, b) => (b.created || 0) - (a.created || 0))
        .map((m) => m.id)
        .filter(
          (id) =>
            /^(gpt-|o[0-9])/.test(id) &&
            !/(embedding|tts|whisper|transcribe|audio|realtime|image|dall-e|moderation|search|instruct|davinci|babbage|codex)/.test(id),
        ),
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/models",
    headers: (key) => ({ "x-api-key": key, "anthropic-version": "2023-06-01" }),
    parse: (j) => (j.data || []).map((m) => m.id),
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
    headers: (key) => ({ "x-goog-api-key": key }),
    parse: (j) =>
      (j.models || [])
        .map((m) => (m.name || "").replace(/^models\//, ""))
        .filter((id) => id.startsWith("gemini-") && !/(embedding|aqa|learnlm|live|tts|image|audio)/.test(id)),
  },
  xai: {
    url: "https://api.x.ai/v1/models",
    headers: bearer,
    parse: (j) => (j.data || []).map((m) => m.id),
  },
  deepseek: {
    url: "https://api.deepseek.com/models",
    headers: bearer,
    parse: (j) => (j.data || []).map((m) => m.id),
  },
  moonshot: {
    url: "https://api.moonshot.ai/v1/models",
    headers: bearer,
    parse: (j) => (j.data || []).map((m) => m.id),
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/models",
    keyless: true,
    headers: () => ({}),
    parse: (j) => (j.data || []).map((m) => m.id),
  },
  nvidia_nim: {
    url: "https://integrate.api.nvidia.com/v1/models",
    headers: bearer,
    parse: (j) => (j.data || []).map((m) => m.id),
  },
  groq: {
    url: "https://api.groq.com/openai/v1/models",
    headers: bearer,
    parse: (j) => (j.data || []).map((m) => m.id),
  },
};

// Curated latest lineups (July 2026) — served when no key or the live fetch fails.
const STATIC_MODELS = {
  openai: ["gpt-5.6", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5.5-pro", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.3-instant"],
  anthropic: ["claude-fable-5", "claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5"],
  gemini: ["gemini-3.5-flash", "gemini-3.5-pro", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-2.5-pro", "gemini-2.5-flash"],
  perplexity: ["sonar-pro", "sonar", "sonar-reasoning-pro", "sonar-reasoning", "sonar-deep-research"],
  xai: ["grok-4.5", "grok-4.3", "grok-4.20", "grok-4.1-fast", "grok-code-fast-1", "grok-4-fast"],
  deepseek: ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-pro", "deepseek-v4-flash"],
  moonshot: ["kimi-k3", "kimi-k2.7-code", "kimi-k2.6", "kimi-k2-thinking", "moonshot-v1-128k"],
  openrouter: ["openai/gpt-5.6", "anthropic/claude-fable-5", "google/gemini-3.5-flash", "x-ai/grok-4.5", "deepseek/deepseek-v4-pro", "moonshotai/kimi-k3", "z-ai/glm-5.2", "minimax/minimax-m3"],
  zai: ["glm-5.2", "glm-5.1", "glm-4.7", "glm-4.5-air"],
  minimax: ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.5", "MiniMax-M2"],
  sakana: ["fugu", "fugu-ultra"],
  nvidia_nim: ["deepseek-ai/deepseek-v4", "meta/llama-4-maverick-17b-128e-instruct", "nvidia/llama-3.3-nemotron-super-49b-v1", "qwen/qwen3-235b-a22b"],
  groq: ["moonshotai/kimi-k2-instruct", "meta-llama/llama-4-maverick-17b-128e-instruct", "llama-3.3-70b-versatile", "qwen/qwen3-32b"],
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_MODELS = 150;
const cache = new Map();

export function isKnownProvider(provider) {
  return Boolean(PROVIDERS[provider] || STATIC_MODELS[provider]);
}

export async function fetchProviderModels(provider, apiKey) {
  const def = PROVIDERS[provider];
  const fallback = { models: STATIC_MODELS[provider] || [], source: "static" };
  if (!def || (!apiKey && !def.keyless)) return fallback;

  const cacheKey = `${provider}:${apiKey || ""}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { models: hit.models, source: "live" };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(def.url, { headers: def.headers(apiKey), signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const models = def.parse(await res.json()).slice(0, MAX_MODELS);
    if (!models.length) return fallback;
    cache.set(cacheKey, { models, at: Date.now() });
    return { models, source: "live" };
  } catch (err) {
    console.error(`[ModelCatalog] ${provider} live fetch failed:`, err.message);
    return fallback;
  }
}
