import axios from "axios";
import { SYSTEM_PROMPTS, buildUserMessage, buildOutput } from "./codingAgent.helper.js";
import { OLLAMA_HOST } from "../../config/env.js";

export default {
  async run(config) {
    const operation = config.operation || "generate";
    const model     = config.model     || "llama3.2";
    const baseUrl   = (config.baseUrl  || OLLAMA_HOST).replace(/\/$/, "");
    const maxTokens = parseInt(config.maxTokens) || 4000;
    const temp      = parseFloat(config.temperature ?? 0.2);

    const userMsg = buildUserMessage(operation, config);

    try {
      const res = await axios.post(
        `${baseUrl}/v1/chat/completions`,
        { model, max_tokens: maxTokens, temperature: temp,
          messages: [
            { role: "system", content: SYSTEM_PROMPTS.ollama },
            { role: "user",   content: userMsg },
          ] },
        { headers: { "Content-Type": "application/json" }, timeout: 120000 },
      );
      const text = res.data.choices?.[0]?.message?.content || "";
      return buildOutput(text, model, null, operation, "ollama");
    } catch (err) {
      if (err.message?.startsWith("Ollama")) throw err;
      if (err.code === "ECONNREFUSED") throw new Error(`Ollama: Cannot connect to ${baseUrl}. Is Ollama running?`);
      if (err.code === "ETIMEDOUT" || err.code === "ECONNRESET") throw new Error(`Ollama: Connection to ${baseUrl} timed out or was reset.`);
      const detail = err.response?.data?.error || err.message;
      throw new Error(`Ollama: ${err.response?.status ?? "Error"} — ${detail}`);
    }
  },
};
