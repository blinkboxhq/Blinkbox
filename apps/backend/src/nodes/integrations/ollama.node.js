import axios from "axios";
import { SYSTEM_PROMPTS, buildUserMessage, buildOutput } from "./codingAgent.helper.js";

export default {
  async run(config) {
    const operation = config.operation || "generate";
    const model     = config.model     || "llama3.2";
    const baseUrl   = (config.baseUrl  || "http://localhost:11434").replace(/\/$/, "");
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
      if (err.code === "ECONNREFUSED") throw new Error(`Ollama: Cannot connect to ${baseUrl}. Is Ollama running?`);
      throw new Error(`Ollama failed: ${err.response?.data?.error || err.message}`);
    }
  },
};
