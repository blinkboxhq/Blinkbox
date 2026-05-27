/**
 * Satellite handler for agent_ollama / agent_lmstudio chat model nodes.
 *
 * These nodes exist purely to supply provider config to a connected AI Agent.
 * When tested standalone (Run Test), they do a quick connectivity ping to the
 * local server and return its model list so the user knows everything is wired up.
 */

import axios from "axios";

async function ping(baseUrl, providerLabel) {
  const base = baseUrl.replace(/\/$/, "").replace(/\/v1\/chat\/completions$/, "").replace(/\/v1$/, "");
  try {
    const res = await axios.get(`${base}/v1/models`, { timeout: 5000 });
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
        `${providerLabel}: Cannot reach ${base}. ` +
        (providerLabel === "Ollama"
          ? "Make sure Ollama is running (ollama serve) and the backend is on the same machine."
          : "Make sure LM Studio is running with the local server enabled (Developer tab → Start Server).")
      );
    }
    // Server responded but /v1/models may not exist — still connected
    return { status: "connected", baseUrl: base, provider: providerLabel, modelsAvailable: [] };
  }
}

export const agentOllamaNode = {
  async run(config) {
    const baseUrl = config.baseUrl || "http://127.0.0.1:11434";
    return ping(baseUrl, "Ollama");
  },
};

export const agentLmStudioNode = {
  async run(config) {
    const baseUrl = config.baseUrl || "http://127.0.0.1:1234";
    return ping(baseUrl, "LM Studio");
  },
};
