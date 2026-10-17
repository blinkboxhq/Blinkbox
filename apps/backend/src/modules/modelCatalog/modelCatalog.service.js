import { MODEL_LINEUPS } from "../../utils/aiModels.js";

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

// Curated lineups — served when no key or the live fetch fails.
const STATIC_MODELS = MODEL_LINEUPS;

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
