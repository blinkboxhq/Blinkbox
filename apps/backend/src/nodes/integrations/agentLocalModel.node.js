/**
 * Satellite handlers for agent_ollama / agent_lmstudio chat model nodes.
 *
 * When tested standalone (Run Test):
 *  - Ollama: pings /api/tags, returns installed models. Falls back to server Ollama if no baseUrl set.
 *  - LM Studio (OpenAI Compat): pings /v1/models at the configured URL.
 */

import axios from "axios";
import { OLLAMA_HOST, LM_STUDIO_BASE_URL } from "../../config/env.js";

const SERVER_OLLAMA_BASE = OLLAMA_HOST.replace(/\/$/, "");

async function pingOllama(baseUrl) {
  const base = baseUrl
    ? baseUrl.replace(/\/$/, "").replace(/\/v1\/chat\/completions$/, "").replace(/\/v1$/, "")
    : SERVER_OLLAMA_BASE;

  try {
    const res = await axios.get(`${base}/api/tags`, { timeout: 120000 });
    const models = (res.data?.models || []).map((m) => m.name).filter(Boolean);
    return {
      status: "connected",
      baseUrl: base,
      provider: "Ollama",
      modelsAvailable: models,
      serverSide: !baseUrl,
      hint: "Attach this node to an AI Agent node's Chat Model handle to use it.",
    };
  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT") {
      const where = baseUrl ? base : `server (${base})`;
      throw new Error(
        `Ollama: Cannot reach ${where}. ` +
          (baseUrl
            ? "Check the Base URL is correct and Ollama is running."
            : "Ollama is not running on this server. It will start automatically on next reboot.")
      );
    }
    return { status: "connected", baseUrl: base, provider: "Ollama", modelsAvailable: [] };
  }
}

async function pingOpenAICompat(baseUrl, providerLabel) {
  const base = (baseUrl || "http://127.0.0.1:1234")
    .replace(/\/$/, "")
    .replace(/\/v1\/chat\/completions$/, "")
    .replace(/\/v1$/, "");

  try {
    const res = await axios.get(`${base}/v1/models`, { timeout: 120000 });
    const models = (res.data?.data || []).map((m) => m.id || m.name).filter(Boolean);
    return {
      status: "connected",
      baseUrl: base,
      provider: providerLabel,
      modelsAvailable: models,
      hint: "Attach this node to an AI Agent node's Chat Model handle to use it.",
    };
  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT") {
      throw new Error(
        `${providerLabel}: Cannot reach ${base}. Make sure the server is running and the Base URL is correct.`
      );
    }
    return { status: "connected", baseUrl: base, provider: providerLabel, modelsAvailable: [] };
  }
}

export const agentOllamaNode = {
  async run(config) {
    return pingOllama(config.baseUrl || null);
  },
};

export const agentLmStudioNode = {
  async run(config) {
    return pingOpenAICompat(config.baseUrl || LM_STUDIO_BASE_URL, "OpenAI Compatible");
  },
};
